"use client";

import { useMess } from "@/context/MessContext";
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
            create.mutate();
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
              <li key={r.id}>
                <p className="font-medium">{r.title}</p>
                {r.description && <p className="text-gray-500 text-xs">{r.description}</p>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {!data?.rules?.length && <p className="text-sm text-gray-400">No rules set up yet.</p>}
    </div>
  );
}
