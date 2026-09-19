"use client";

import { useMess } from "@/context/MessContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Pagination } from "@/components/Pagination";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function AdvancesPage() {
  const { can } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();
  const canManage = can("mealFinance");

  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("DEPOSIT");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "create" } | { kind: "save" } | { kind: "delete"; id: string } | null>(null);

  const { data: members } = useQuery({
    queryKey: ["members", params.messUsername],
    queryFn: () => api.get<{ members: any[] }>(`/mess/${params.messUsername}/members`),
    enabled: canManage,
  });

  const { data } = useQuery({
    queryKey: ["advances", params.messUsername, page],
    queryFn: () =>
      api.get<{ transactions: any[]; page: number; totalPages: number; total: number }>(
        `/mess/${params.messUsername}/advances?page=${page}&pageSize=10`
      ),
  });

  const record = useMutation({
    mutationFn: () => api.post(`/mess/${params.messUsername}/advances`, { userId, amount: Number(amount), type }),
    onSuccess: () => {
      setAmount("");
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["advances", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["balance", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["sidebar-counts", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["overview", params.messUsername] });
    },
  });

  const update = useMutation({
    mutationFn: (t: any) =>
      api.patch(`/mess/${params.messUsername}/advances/${t.id}`, {
        userId: t.userId,
        amount: Number(t.amount),
        type: t.type,
      }),
    onSuccess: () => {
      setEditing(null);
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["advances", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["balance", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["sidebar-counts", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["overview", params.messUsername] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/mess/${params.messUsername}/advances/${id}`),
    onSuccess: () => {
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["advances", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["balance", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["sidebar-counts", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["overview", params.messUsername] });
    },
  });

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Advances</h1>
      <p className="text-sm text-gray-500">Meal-related member advances. Rent and other bills are separate.</p>

      {canManage && (
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setConfirm({ kind: "create" });
          }}
        >
          <h2 className="font-medium text-sm">Record an advance transaction</h2>
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
                {["DEPOSIT", "USE", "ADJUSTMENT", "REFUND"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {record.isError && (
            <p className="text-sm text-red-600">{(record.error as Error)?.message || "Could not record"}</p>
          )}
          <button className="btn-primary w-full" disabled={record.isPending} type="submit">
            {record.isPending ? "Recording…" : "Record"}
          </button>
        </form>
      )}

      <div className="card">
        <ul className="divide-y text-sm">
          {data?.transactions?.map((t: any) => (
            <li key={t.id} className="py-3 space-y-2">
              {editing && editing.id === t.id ? (
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
                      {["DEPOSIT", "USE", "ADJUSTMENT", "REFUND"].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-xs" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                    <button className="btn-primary text-xs" onClick={() => setConfirm({ kind: "save" })}>
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {t.type} · {t.user?.name ?? "Member"}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(t.createdAt).toDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p>৳{t.amount}</p>
                    {canManage && (
                      <div className="flex gap-2 justify-end mt-1">
                        <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing({ ...t })}>
                          Edit
                        </button>
                        <button className="text-xs text-red-600 hover:underline" onClick={() => setConfirm({ kind: "delete", id: t.id })}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
          {!data?.transactions?.length && <p className="text-sm text-gray-400 py-2">No advance transactions yet.</p>}
        </ul>
        <Pagination page={data?.page ?? page} totalPages={data?.totalPages ?? 1} total={data?.total} onPage={setPage} />
      </div>

      <ConfirmModal
        open={confirm?.kind === "create"}
        title="Record this advance?"
        message={`${type} · ৳${amount}`}
        confirmLabel="Record"
        pending={record.isPending}
        onConfirm={() => record.mutate()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.kind === "save"}
        title="Save advance changes?"
        message="The member's advance balance will change."
        confirmLabel="Save"
        pending={update.isPending}
        onConfirm={() => editing && update.mutate(editing)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.kind === "delete"}
        title="Delete this advance?"
        message="This cannot be undone."
        confirmLabel="Delete"
        danger
        pending={remove.isPending}
        onConfirm={() => confirm?.kind === "delete" && remove.mutate(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
