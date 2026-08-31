"use client";

import { useMess } from "@/context/MessContext";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function AdvancesPage() {
  const { myRole } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();

  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("DEPOSIT");

  const { data: members } = useQuery({
    queryKey: ["members", params.messUsername],
    queryFn: () => api.get<{ members: any[] }>(`/mess/${params.messUsername}/members`),
    enabled: myRole === "ADMIN",
  });

  const { data } = useQuery({
    queryKey: ["advances", params.messUsername],
    queryFn: () => api.get<{ transactions: any[] }>(`/mess/${params.messUsername}/advances`),
  });

  const record = useMutation({
    mutationFn: () =>
      api.post(`/mess/${params.messUsername}/advances`, { userId, amount: Number(amount), type }),
    onSuccess: () => {
      setAmount("");
      qc.invalidateQueries({ queryKey: ["advances", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["balance", params.messUsername] });
    },
  });

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Advances</h1>

      {myRole === "ADMIN" && (
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            record.mutate();
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
          <button className="btn-primary w-full" disabled={record.isPending} type="submit">
            {record.isPending ? "Recording…" : "Record"}
          </button>
        </form>
      )}

      <div className="card">
        <ul className="divide-y text-sm">
          {data?.transactions?.map((t: any) => (
            <li key={t.id} className="py-3 flex justify-between">
              <span>{t.type}</span>
              <span>
                ৳{t.amount} · {new Date(t.createdAt).toDateString()}
              </span>
            </li>
          ))}
          {!data?.transactions?.length && <p className="text-sm text-gray-400 py-2">No advance transactions yet.</p>}
        </ul>
      </div>
    </div>
  );
}
