"use client";

import { useMess } from "@/context/MessContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";

export default function NotesPage() {
  const { permissions } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const myId = (session as any)?.apiUser?.id as string | undefined;
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "save"; id: string } | { kind: "delete"; id: string } | null>(null);

  const { data } = useQuery({
    queryKey: ["notes", params.messUsername],
    queryFn: () => api.get<{ notes: any[] }>(`/mess/${params.messUsername}/notes`),
    refetchInterval: 20000,
  });

  const create = useMutation({
    mutationFn: () => api.post(`/mess/${params.messUsername}/notes`, { title }),
    onSuccess: () => {
      setTitle("");
      qc.invalidateQueries({ queryKey: ["notes", params.messUsername] });
    },
  });

  const complete = useMutation({
    mutationFn: (id: string) => api.patch(`/mess/${params.messUsername}/notes/${id}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes", params.messUsername] }),
  });

  const update = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.patch(`/mess/${params.messUsername}/notes/${id}`, { title }),
    onSuccess: () => {
      setEditing(null);
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["notes", params.messUsername] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/mess/${params.messUsername}/notes/${id}`),
    onSuccess: () => {
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["notes", params.messUsername] });
    },
  });

  function canEdit(n: any) {
    return permissions?.isStaff || n.createdBy?.id === myId;
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Shopping Notes</h1>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) create.mutate();
        }}
      >
        <input
          className="input"
          placeholder="Need cooking oil…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="btn-primary shrink-0" disabled={create.isPending} type="submit">
          Add
        </button>
      </form>

      <div className="card">
        <ul className="divide-y text-sm">
          {data?.notes?.map((n: any) => (
            <li key={n.id} className="py-3 space-y-2">
              {editing && editing.id === n.id ? (
                <div className="flex gap-2">
                  <input
                    className="input"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  />
                  <button className="btn-secondary text-xs" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                  <button className="btn-primary text-xs" onClick={() => setConfirm({ kind: "save", id: n.id })}>
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={n.status === "COMPLETED" ? "line-through text-gray-400" : ""}>{n.title}</p>
                    <p className="text-xs text-gray-400">
                      by {n.createdBy?.name}
                      {n.completedBy ? ` · done by ${n.completedBy.name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {n.status !== "COMPLETED" && (
                      <button className="btn-secondary text-xs" onClick={() => complete.mutate(n.id)}>
                        Mark done
                      </button>
                    )}
                    {canEdit(n) && (
                      <>
                        <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing({ id: n.id, title: n.title })}>
                          Edit
                        </button>
                        <button className="text-xs text-red-600 hover:underline" onClick={() => setConfirm({ kind: "delete", id: n.id })}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
          {!data?.notes?.length && <p className="text-sm text-gray-400 py-2">Nothing on the list.</p>}
        </ul>
      </div>

      <ConfirmModal
        open={confirm?.kind === "save"}
        title="Save note changes?"
        message="The note text will be updated."
        confirmLabel="Save"
        pending={update.isPending}
        onConfirm={() => editing && update.mutate(editing)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.kind === "delete"}
        title="Delete this note?"
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
