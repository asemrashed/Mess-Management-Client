"use client";

import { useMess } from "@/context/MessContext";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function PollsPage() {
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [showForm, setShowForm] = useState(false);

  const { data } = useQuery({
    queryKey: ["polls", params.messUsername],
    queryFn: () => api.get<{ polls: any[] }>(`/mess/${params.messUsername}/polls`),
    refetchInterval: 20000,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post(`/mess/${params.messUsername}/polls`, {
        question,
        options: options.filter((o) => o.trim()),
      }),
    onSuccess: () => {
      setQuestion("");
      setOptions(["", ""]);
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["polls", params.messUsername] });
    },
  });

  const vote = useMutation({
    mutationFn: (optionId: string) =>
      api.post(`/mess/${params.messUsername}/polls/${polls_pollIdFor(optionId)}/vote`, { optionIds: [optionId] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["polls", params.messUsername] }),
  });

  // helper closure to find pollId for an optionId from currently loaded data
  function polls_pollIdFor(optionId: string) {
    const poll = data?.polls?.find((p: any) => p.options.some((o: any) => o.id === optionId));
    return poll?.id;
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Polls</h1>
        <button className="btn-secondary text-sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "New Poll"}
        </button>
      </div>

      {showForm && (
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div>
            <label className="label">Question</label>
            <input className="input" value={question} onChange={(e) => setQuestion(e.target.value)} required />
          </div>
          {options.map((opt, i) => (
            <div key={i}>
              <label className="label">Option {i + 1}</label>
              <input
                className="input"
                value={opt}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-brand-600"
            onClick={() => setOptions([...options, ""])}
          >
            + Add option
          </button>
          <button className="btn-primary w-full" disabled={create.isPending} type="submit">
            Create Poll
          </button>
        </form>
      )}

      <div className="space-y-4">
        {data?.polls?.map((p: any) => {
          const totalVotes = p.options.reduce((sum: number, o: any) => sum + o.votes.length, 0);
          return (
            <div key={p.id} className="card">
              <p className="font-medium mb-3">{p.question}</p>
              <div className="space-y-2">
                {p.options.map((o: any) => {
                  const pct = totalVotes ? Math.round((o.votes.length / totalVotes) * 100) : 0;
                  return (
                    <button
                      key={o.id}
                      className="w-full text-left"
                      onClick={() => vote.mutate(o.id)}
                      disabled={vote.isPending}
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span>{o.text}</span>
                        <span className="text-gray-400">{o.votes.length} vote(s)</span>
                      </div>
                      <div className="h-2 rounded bg-gray-100 overflow-hidden">
                        <div className="h-2 bg-brand-500" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!data?.polls?.length && <p className="text-sm text-gray-400">No polls yet.</p>}
      </div>
    </div>
  );
}
