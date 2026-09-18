"use client";

import { useMess } from "@/context/MessContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function RulesPage() {
  const { myRole } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();

  const [category, setCategory] = useState("general");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "create" } | { kind: "save" } | { kind: "delete"; id: string } | null>(null);

  const { data } = useQuery({
    queryKey: ["rules", params.messUsername],
    queryFn: () => api.get<{ rules: any[] }>(`/mess/${params.messUsername}/rules`),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post(`/mess/${params.messUsername}/rules`, { category, title, description: description || undefined }),
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["rules", params.messUsername] });
    },
  });

  const update = useMutation({
    mutationFn: (r: any) =>
      api.patch(`/mess/${params.messUsername}/rules/${r.id}`, {
        category: r.category,
        title: r.title,
        description: r.description || undefined,
      }),
    onSuccess: () => {
      setEditing(null);
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["rules", params.messUsername] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/mess/${params.messUsername}/rules/${id}`),
    onSuccess: () => {
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["rules", params.messUsername] });
    },
  });

  const grouped = (data?.rules ?? []).reduce((acc: Record<string, any[]>, r: any) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Rules</h1>

      {myRole === "ADMIN" && (
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setConfirm({ kind: "create" });
          }}
        >
          <h2 className="font-medium text-sm">Add a rule</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {["meals", "payments", "guests", "cleaning", "grocery", "rent", "exit", "general"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Title</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <button className="btn-primary w-full" disabled={create.isPending} type="submit">
            {create.isPending ? "Adding…" : "Add Rule"}
          </button>
        </form>
      )}

      {Object.entries(grouped).map(([cat, rules]) => (
        <div key={cat} className="card">
          <h2 className="font-medium mb-2 capitalize">{cat}</h2>
          <ul className="text-sm space-y-2">
            {rules.map((r: any) => (
              <li key={r.id} className="space-y-2">
                {editing && editing.id === r.id ? (
                  <div className="space-y-2">
                    <input
                      className="input"
                      value={editing.title}
                      onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    />
                    <textarea
                      className="input"
                      rows={2}
                      value={editing.description ?? ""}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    />
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
                    <p className="font-medium">{r.title}</p>
                    {r.description && <p className="text-gray-500 text-xs">{r.description}</p>}
                    {myRole === "ADMIN" && (
                      <div className="flex gap-2">
                        <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing({ ...r })}>
                          Edit
                        </button>
                        <button className="text-xs text-red-600 hover:underline" onClick={() => setConfirm({ kind: "delete", id: r.id })}>
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {!data?.rules?.length && <p className="text-sm text-gray-400">No rules set up yet.</p>}

      <ConfirmModal
        open={confirm?.kind === "create"}
        title="Add this rule?"
        message={title}
        confirmLabel="Add rule"
        pending={create.isPending}
        onConfirm={() => create.mutate()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.kind === "save"}
        title="Save rule changes?"
        message="Members will see the updated text."
        confirmLabel="Save"
        pending={update.isPending}
        onConfirm={() => editing && update.mutate(editing)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.kind === "delete"}
        title="Delete this rule?"
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
