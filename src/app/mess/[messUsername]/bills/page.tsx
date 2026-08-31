"use client";

import { useMess } from "@/context/MessContext";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function BillsPage() {
  const { myRole } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("rent");
  const [amount, setAmount] = useState("");

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
      qc.invalidateQueries({ queryKey: ["bills", params.messUsername] });
    },
  });

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Bills</h1>

      {myRole === "ADMIN" && (
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
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
                {["rent", "wifi", "electricity", "water", "gas", "maid", "cleaning", "other"].map((c) => (
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
          <button className="btn-primary w-full" disabled={create.isPending} type="submit">
            {create.isPending ? "Adding…" : "Add Bill"}
          </button>
        </form>
      )}

      <div className="card">
        <ul className="divide-y text-sm">
          {data?.bills?.map((b: any) => (
            <li key={b.id} className="py-3">
              <div className="flex justify-between">
                <span className="font-medium">{b.title}</span>
                <span>৳{b.amount}</span>
              </div>
              <p className="text-xs text-gray-400">
                {b.category} · {b.billingPeriod} · {b.distributionMethod === "EQUAL" ? "split equally" : "custom split"}
              </p>
            </li>
          ))}
          {!data?.bills?.length && <p className="text-sm text-gray-400 py-2">No bills yet.</p>}
        </ul>
      </div>
    </div>
  );
}
