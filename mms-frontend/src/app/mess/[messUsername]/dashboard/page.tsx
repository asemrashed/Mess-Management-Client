"use client";

import { useMess } from "@/context/MessContext";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Balance {
  balanceDue: string;
  advanceBalance: string;
}

export default function DashboardPage() {
  const { mess, myRole, isLoading } = useMess();
  const params = useParams<{ messUsername: string }>();

  const { data: balance } = useQuery({
    queryKey: ["balance", params.messUsername],
    queryFn: () => api.get<Balance>(`/mess/${params.messUsername}/payments/balance`),
    enabled: !!mess,
  });

  const { data: mealsToday } = useQuery({
    queryKey: ["meals-mine", params.messUsername],
    queryFn: () => api.get<{ requests: any[] }>(`/mess/${params.messUsername}/meals/mine`),
    enabled: !!mess,
  });

  if (isLoading) return <p className="text-gray-500">Loading dashboard…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{mess?.name}</h1>
        <p className="text-sm text-gray-500">@{mess?.username} · {myRole}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Your balance due</p>
          <p className="text-2xl font-semibold">৳{balance?.balanceDue ?? "…"}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Your advance balance</p>
          <p className="text-2xl font-semibold">৳{balance?.advanceBalance ?? "…"}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium">Your recent meals</h2>
          <Link href={`/mess/${params.messUsername}/meals`} className="text-sm text-brand-600 font-medium">
            Submit tomorrow&apos;s meals →
          </Link>
        </div>
        {mealsToday?.requests?.length ? (
          <ul className="divide-y">
            {mealsToday.requests.slice(0, 5).map((r) => (
              <li key={r.id} className="py-2 flex justify-between text-sm">
                <span>{new Date(r.date).toDateString()}</span>
                <span className="text-gray-500">
                  B:{r.breakfast} L:{r.lunch} D:{r.dinner}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No meal history yet.</p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "groceries", label: "Groceries" },
          { href: "notes", label: "Notes" },
          { href: "polls", label: "Polls" },
          { href: "routines", label: "Routines" },
        ].map((q) => (
          <Link key={q.href} href={`/mess/${params.messUsername}/${q.href}`} className="card text-center hover:bg-gray-50">
            <span className="text-sm font-medium">{q.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
