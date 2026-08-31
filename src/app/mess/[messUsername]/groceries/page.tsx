"use client";

import { useMess } from "@/context/MessContext";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default function GroceriesPage() {
  const { myRole } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));

  const { data } = useQuery({
    queryKey: ["groceries", params.messUsername],
    queryFn: () => api.get<{ purchases: any[] }>(`/mess/${params.messUsername}/groceries`),
    refetchInterval: 20000,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post(`/mess/${params.messUsername}/groceries`, {
        title,
        amount: Number(amount),
        purchaseDate,
      }),
    onSuccess: () => {
      setTitle("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["groceries", params.messUsername] });
    },
  });

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      api.patch(`/mess/${params.messUsername}/groceries/${id}/decision`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groceries", params.messUsername] }),
  });

  const canApprove = myRole === "ADMIN" || myRole === "MANAGER";

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Groceries</h1>

      <form
        className="card space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <h2 className="font-medium text-sm">Submit a purchase</h2>
        <div>
          <label className="label">Item / Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
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
            <label className="label">Purchase date</label>
            <input
              className="input"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
            />
          </div>
        </div>
        <button className="btn-primary w-full" disabled={create.isPending} type="submit">
          {create.isPending ? "Submitting…" : "Submit Purchase"}
        </button>
      </form>

      <div className="card">
        <h2 className="font-medium mb-3">Recent purchases</h2>
        <ul className="divide-y text-sm">
          {data?.purchases?.map((p: any) => (
            <li key={p.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-gray-500 text-xs">
                  ৳{p.amount} · {new Date(p.purchaseDate).toDateString()} · by {p.createdBy?.name}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge ${STATUS_COLOR[p.status]}`}>{p.status}</span>
                {canApprove && p.status === "PENDING" && (
                  <>
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => decide.mutate({ id: p.id, status: "APPROVED" })}
                    >
                      Approve
                    </button>
                    <button
                      className="btn-danger text-xs"
                      onClick={() => decide.mutate({ id: p.id, status: "REJECTED" })}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
          {!data?.purchases?.length && <p className="text-sm text-gray-400 py-2">No purchases yet.</p>}
        </ul>
      </div>
    </div>
  );
}
