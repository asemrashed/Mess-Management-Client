"use client";

import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function NotesPage() {
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");

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
            <li key={n.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className={n.status === "COMPLETED" ? "line-through text-gray-400" : ""}>{n.title}</p>
                <p className="text-xs text-gray-400">
                  by {n.createdBy?.name}
                  {n.completedBy ? ` · done by ${n.completedBy.name}` : ""}
                </p>
              </div>
              {n.status !== "COMPLETED" && (
                <button className="btn-secondary text-xs shrink-0" onClick={() => complete.mutate(n.id)}>
                  Mark done
                </button>
              )}
            </li>
          ))}
          {!data?.notes?.length && <p className="text-sm text-gray-400 py-2">Nothing on the list.</p>}
        </ul>
      </div>
    </div>
  );
}
