"use client";

import { useMess } from "@/context/MessContext";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function ExitPage() {
  const { myRole } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();

  const [exitDate, setExitDate] = useState("");
  const [reason, setReason] = useState("");

  const { data } = useQuery({
    queryKey: ["exit-requests", params.messUsername],
    queryFn: () => api.get<{ requests: any[] }>(`/mess/${params.messUsername}/exit`),
  });

  const submit = useMutation({
    mutationFn: () => api.post(`/mess/${params.messUsername}/exit`, { exitDate, reason: reason || undefined }),
    onSuccess: () => {
      setExitDate("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["exit-requests", params.messUsername] });
    },
  });

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      api.patch(`/mess/${params.messUsername}/exit/${id}/decision`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exit-requests", params.messUsername] }),
  });

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Permanent Exit</h1>
      <p className="text-sm text-gray-500">
        This is for permanently leaving the Mess, not a short vacation. Submitting a request triggers
        a settlement calculation that an Admin will review and approve.
      </p>

      <form
        className="card space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <div>
          <label className="label">Exit date</label>
          <input className="input" type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} required />
        </div>
        <div>
          <label className="label">Reason (optional)</label>
          <textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </div>
        <button className="btn-primary w-full" disabled={submit.isPending} type="submit">
          {submit.isPending ? "Submitting…" : "Submit Exit Request"}
        </button>
      </form>

      <div className="card">
        <ul className="divide-y text-sm">
          {data?.requests?.map((r: any) => (
            <li key={r.id} className="py-3 space-y-1">
              <div className="flex justify-between">
                <span className="font-medium">{r.user?.name ?? "You"}</span>
                <span className="badge bg-gray-100 text-gray-700">{r.status}</span>
              </div>
              <p className="text-xs text-gray-400">Exit date: {new Date(r.exitDate).toDateString()}</p>
              {r.summary && (
                <p className="text-xs text-gray-500">
                  Final due: ৳{r.summary.finalDue} · Advance refund: ৳{r.summary.advanceRefund}
                </p>
              )}
              {myRole === "ADMIN" && r.status === "PENDING" && (
                <div className="flex gap-2 pt-1">
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => decide.mutate({ id: r.id, status: "APPROVED" })}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-danger text-xs"
                    onClick={() => decide.mutate({ id: r.id, status: "REJECTED" })}
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
          {!data?.requests?.length && <p className="text-sm text-gray-400 py-2">No exit requests.</p>}
        </ul>
      </div>
    </div>
  );
}
