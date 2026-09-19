"use client";

import { billCategoryScope, useMess } from "@/context/MessContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

const CATEGORIES = ["rent", "wifi", "electricity", "water", "gas", "maid", "cleaning", "other"];

export default function BillsPage() {
  const { can, myRole } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();

  const allowedCategories = useMemo(
    () => CATEGORIES.filter((c) => can(billCategoryScope(c))),
    [can]
  );
  const canCreate = allowedCategories.length > 0;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("rent");
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "create" } | { kind: "save" } | { kind: "delete"; id: string } | null>(null);

  useEffect(() => {
    if (allowedCategories.length && !allowedCategories.includes(category)) {
      setCategory(allowedCategories[0]);
    }
  }, [allowedCategories, category]);

  const { data } = useQuery({
    queryKey: ["bills", params.messUsername],
    queryFn: () => api.get<{ bills: any[] }>(`/mess/${params.messUsername}/bills`),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post(`/mess/${params.messUsername}/bills`, {
        title,
        category,
        amount: Number(amount),
        distributionMethod: "EQUAL",
      }),
    onSuccess: () => {
      setTitle("");
      setAmount("");
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["bills", params.messUsername] });
    },
  });

  const update = useMutation({
    mutationFn: (b: any) =>
      api.patch(`/mess/${params.messUsername}/bills/${b.id}`, {
        title: b.title,
        category: b.category,
        amount: Number(b.amount),
        distributionMethod: "EQUAL",
      }),
    onSuccess: () => {
      setEditing(null);
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["bills", params.messUsername] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/mess/${params.messUsername}/bills/${id}`),
    onSuccess: () => {
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["bills", params.messUsername] });
    },
  });

  function canManageRow(b: any) {
    return can(billCategoryScope(b.category));
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Bills</h1>
      {myRole === "MANAGER" && !canCreate && (
        <p className="text-sm text-gray-500">
          Rent, WiFi, and other bills are managed by the admin. Ask them to grant access in Settings if you should handle a category.
        </p>
      )}

      {canCreate && (
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setConfirm({ kind: "create" });
          }}
        >
          <h2 className="font-medium text-sm">Add a bill (split equally)</h2>
          <div>
            <label className="label">Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {allowedCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
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
          </div>
          {create.isError && (
            <p className="text-sm text-red-600">{(create.error as Error)?.message || "Could not add bill"}</p>
          )}
          <button className="btn-primary w-full" disabled={create.isPending} type="submit">
            {create.isPending ? "Adding…" : "Add Bill"}
          </button>
        </form>
      )}

      <div className="card">
        <ul className="divide-y text-sm">
          {data?.bills?.map((b: any) => (
            <li key={b.id} className="py-3 space-y-2">
              {editing && editing.id === b.id ? (
                <div className="space-y-2">
                  <input
                    className="input"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="input"
                      value={editing.category}
                      onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    >
                      {allowedCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editing.amount}
                      onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                    />
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
                <>
                  <div className="flex justify-between">
                    <span className="font-medium">{b.title}</span>
                    <span>৳{b.amount}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {b.category} · {b.billingPeriod} · {b.distributionMethod === "EQUAL" ? "split equally" : "custom split"}
                  </p>
                  {canManageRow(b) && (
                    <div className="flex gap-2">
                      <button className="btn-secondary text-xs" onClick={() => setEditing({ ...b })}>
                        Edit
                      </button>
                      <button className="text-xs text-red-600 hover:underline" onClick={() => setConfirm({ kind: "delete", id: b.id })}>
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
          {!data?.bills?.length && <p className="text-sm text-gray-400 py-2">No bills yet.</p>}
        </ul>
      </div>

      <ConfirmModal
        open={confirm?.kind === "create"}
        title="Add this bill?"
        message={`${title} (${category}) · ৳${amount}, split equally among members.`}
        confirmLabel="Add bill"
        pending={create.isPending}
        onConfirm={() => create.mutate()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.kind === "save"}
        title="Save bill changes?"
        message="Shares will be recalculated if the amount changed."
        confirmLabel="Save"
        pending={update.isPending}
        onConfirm={() => editing && update.mutate(editing)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.kind === "delete"}
        title="Delete this bill?"
        message="Member assignments for this bill will also be removed."
        confirmLabel="Delete"
        danger
        pending={remove.isPending}
        onConfirm={() => confirm?.kind === "delete" && remove.mutate(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
