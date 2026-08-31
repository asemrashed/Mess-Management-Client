"use client";

import { useMess } from "@/context/MessContext";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function PaymentsPage() {
  const { myRole } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();

  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("MEAL");

  const { data: members } = useQuery({
    queryKey: ["members", params.messUsername],
    queryFn: () => api.get<{ members: any[] }>(`/mess/${params.messUsername}/members`),
    enabled: myRole === "ADMIN" || myRole === "MANAGER",
  });

  const { data } = useQuery({
    queryKey: ["payments", params.messUsername],
    queryFn: () => api.get<{ payments: any[] }>(`/mess/${params.messUsername}/payments`),
  });

  const record = useMutation({
    mutationFn: () =>
      api.post(`/mess/${params.messUsername}/payments`, { userId, amount: Number(amount), type }),
    onSuccess: () => {
      setAmount("");
      qc.invalidateQueries({ queryKey: ["payments", params.messUsername] });
      qc.invalidateQueries({ queryKey: ["balance", params.messUsername] });
    },
  });

  const canRecord = myRole === "ADMIN" || myRole === "MANAGER";

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Payments</h1>

      {canRecord && (
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            record.mutate();
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
                {["MEAL", "RENT", "UTILITY", "GENERAL", "ADVANCE"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn-primary w-full" disabled={record.isPending} type="submit">
            {record.isPending ? "Recording…" : "Record Payment"}
          </button>
        </form>
      )}

      <div className="card">
        <ul className="divide-y text-sm">
          {data?.payments?.map((p: any) => (
            <li key={p.id} className="py-3 flex justify-between">
              <span>{p.type}</span>
              <span>
                ৳{p.amount} · {new Date(p.paymentDate).toDateString()}
              </span>
            </li>
          ))}
          {!data?.payments?.length && <p className="text-sm text-gray-400 py-2">No payments yet.</p>}
        </ul>
      </div>
    </div>
  );
}
