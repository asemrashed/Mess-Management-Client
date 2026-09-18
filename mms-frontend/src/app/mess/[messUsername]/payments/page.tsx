"use client";

import { useMess } from "@/context/MessContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const ALL_TYPES = ["MEAL", "RENT", "UTILITY", "GENERAL", "ADVANCE"] as const;

export default function PaymentsPage() {
  const { myRole, can, permissions } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();

  const allowedTypes = ALL_TYPES.filter((t) => {
    if (myRole === "ADMIN") return true;
    if (t === "MEAL" || t === "ADVANCE") return can("mealFinance");
    if (t === "RENT") return can("rent");
    if (t === "UTILITY") return can("utilities") || can("wifi");
    if (t === "GENERAL") return can("otherBills");
    return false;
  });

  const canRecord = allowedTypes.length > 0;

  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<string>("MEAL");
  const [editing, setEditing] = useState<any | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "create" } | { kind: "save"; id: string } | { kind: "delete"; id: string } | null>(
    null
  );

  useEffect(() => {
    if (!allowedTypes.includes(type as any) && allowedTypes[0]) setType(allowedTypes[0]);
  }, [allowedTypes, type]);

  const { data: members } = useQuery({
    queryKey: ["members", params.messUsername],
    queryFn: () => api.get<{ members: any[] }>(`/mess/${params.messUsername}/members`),
    enabled: canRecord,
  });

  const { data } = useQuery({
    queryKey: ["payments", params.messUsername],
    queryFn: () => api.get<{ payments: any[] }>(`/mess/${params.messUsername}/payments`),
  });

  const record = useMutation({
    mutationFn: () => api.post(`/mess/${params.messUsername}/payments`, { userId, amount: Number(amount), type }),
    onSuccess: () => {
      setAmount("");
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["payments", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["balance", params.messUsername] });
    },
  });

  const update = useMutation({
    mutationFn: (p: any) =>
      api.patch(`/mess/${params.messUsername}/payments/${p.id}`, {
        userId: p.userId,
        amount: Number(p.amount),
        type: p.type,
      }),
    onSuccess: () => {
      setEditing(null);
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["payments", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["balance", params.messUsername] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/mess/${params.messUsername}/payments/${id}`),
    onSuccess: () => {
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["payments", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["balance", params.messUsername] });
    },
  });

  function canManageRow(p: any) {
    return allowedTypes.includes(p.type);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Payments</h1>
      {myRole === "MANAGER" && !permissions?.rent && (
        <p className="text-sm text-gray-500">You can record meal payments and advances. Rent and other bills stay with the admin unless they grant access.</p>
      )}

      {canRecord && (
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setConfirm({ kind: "create" });
          }}
        >
          <h2 className="font-medium text-sm">Record a payment</h2>
          <div>
            <label className="label">Member</label>
            <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)} required>
              <option value="">Select…</option>
              {members?.members?.map((m: any) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (৳)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                {allowedTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {record.isError && (
            <p className="text-sm text-red-600">{(record.error as Error)?.message || "Could not record payment"}</p>
          )}
          <button className="btn-primary w-full" disabled={record.isPending} type="submit">
            {record.isPending ? "Recording…" : "Record Payment"}
          </button>
        </form>
      )}

      <div className="card">
        <ul className="divide-y text-sm">
          {data?.payments?.map((p: any) => (
            <li key={p.id} className="py-3 space-y-2">
              {editing && editing.id === p.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editing.amount}
                      onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                    />
                    <select
                      className="input"
                      value={editing.type}
                      onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                    >
                      {allowedTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-xs" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                    <button className="btn-primary text-xs" onClick={() => setConfirm({ kind: "save", id: p.id })}>
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {p.type} · {p.user?.name ?? "Member"}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(p.paymentDate).toDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p>৳{p.amount}</p>
                    {canManageRow(p) && (
                      <div className="flex gap-2 justify-end mt-1">
                        <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing({ ...p })}>
                          Edit
                        </button>
                        <button className="text-xs text-red-600 hover:underline" onClick={() => setConfirm({ kind: "delete", id: p.id })}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
          {!data?.payments?.length && <p className="text-sm text-gray-400 py-2">No payments yet.</p>}
        </ul>
      </div>

      <ConfirmModal
        open={confirm?.kind === "create"}
        title="Record this payment?"
        message={`${type} · ৳${amount}`}
        confirmLabel="Record"
        pending={record.isPending}
        onConfirm={() => record.mutate()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.kind === "save"}
        title="Save payment changes?"
        message="The ledger will be updated to match."
        confirmLabel="Save"
        pending={update.isPending}
        onConfirm={() => editing && update.mutate(editing)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.kind === "delete"}
        title="Delete this payment?"
        message="This cannot be undone. The ledger entry will also be removed."
        confirmLabel="Delete"
        danger
        pending={remove.isPending}
        onConfirm={() => confirm?.kind === "delete" && remove.mutate(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
