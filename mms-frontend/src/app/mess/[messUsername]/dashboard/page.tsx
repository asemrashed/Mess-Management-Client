"use client";

import { useMess } from "@/context/MessContext";
import { MealRateChart } from "@/components/MealRateChart";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Balance {
  balanceDue: string;
  advanceBalance: string;
}

type Overview = {
  period: { id: string; year: number; month: number; status: string } | null;
  totals: {
    members: number;
    rentDue: string;
    utilityDue: string;
    mealDue: string;
    mealAdvance: string;
    pendingInvites: number;
    pendingExits: number;
    pendingGroceries: number;
    openPolls: number;
  };
  dueMembers: { userId: string; name: string; mealDue: string; rentDue: string; utilityDue: string; totalDue: string }[];
  memberRequests: { id: string; email: string | null; expiresAt: string }[];
  exitRequests: { id: string; name: string; exitDate: string }[];
  polls: { id: string; question: string; endAt: string | null }[];
  todayMeals: {
    date: string;
    submitted: number;
    breakfast: number;
    lunch: number;
    dinner: number;
    requests: { userId: string; name: string; breakfast: number; lunch: number; dinner: number }[];
  };
  mealRateByMonth: { label: string; mealRate: string; totalMeals: number }[];
};

function money(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function StatCard({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: string;
  href?: string;
  hint?: string;
}) {
  const body = (
    <div className="card h-full">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
  if (!href) return body;
  return (
    <Link href={href} className="block hover:bg-gray-50 rounded-xl">
      {body}
    </Link>
  );
}

export default function DashboardPage() {
  const { mess, myRole, isLoading } = useMess();
  const params = useParams<{ messUsername: string }>();
  const base = `/mess/${params.messUsername}`;
  const staff = myRole === "ADMIN" || myRole === "MANAGER";

  const { data: balance } = useQuery({
    queryKey: ["balance", params.messUsername],
    queryFn: () => api.get<Balance>(`/mess/${params.messUsername}/payments/balance`),
    enabled: !!mess,
  });

  const { data: mealsToday } = useQuery({
    queryKey: ["meals-mine", params.messUsername],
    queryFn: () => api.get<{ requests: any[] }>(`/mess/${params.messUsername}/meals/mine`),
    enabled: !!mess && !staff,
  });

  const { data } = useQuery({
    queryKey: ["overview", params.messUsername],
    queryFn: () => api.get<{ overview: Overview }>(`/mess/${params.messUsername}/overview`),
    enabled: !!mess && staff,
    refetchInterval: 20000,
  });

  const overview = data?.overview;

  if (isLoading) return <p className="text-gray-500">Loading dashboard…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{mess?.name}</h1>
        <p className="text-sm text-gray-500">
          @{mess?.username} · {myRole}
          {overview?.period ? ` · ${overview.period.year}-${String(overview.period.month).padStart(2, "0")} ${overview.period.status}` : ""}
        </p>
      </div>

      {myRole === "ADMIN" && overview && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Rent due" value={`৳${money(overview.totals.rentDue)}`} href={`${base}/bills`} hint="Current period rent bills" />
            <StatCard
              label="Meal dues"
              value={`৳${money(overview.totals.mealDue)}`}
              href={`${base}/payments`}
              hint={`Advance ৳${money(overview.totals.mealAdvance)}`}
            />
            <StatCard label="Utility due" value={`৳${money(overview.totals.utilityDue)}`} href={`${base}/bills`} hint="Electricity, water, gas, wifi" />
            <StatCard label="Total members" value={String(overview.totals.members)} href={`${base}/members`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">Members with dues</h2>
                <Link href={`${base}/payments`} className="text-sm text-brand-600 font-medium">
                  Payments →
                </Link>
              </div>
              {overview.dueMembers.length ? (
                <ul className="divide-y text-sm">
                  {overview.dueMembers.slice(0, 8).map((m) => (
                    <li key={m.userId} className="py-2 flex justify-between gap-3">
                      <span className="truncate">{m.name}</span>
                      <span className="font-medium shrink-0">৳{money(m.totalDue)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No outstanding dues right now.</p>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">Member requests</h2>
                <Link href={`${base}/members`} className="text-sm text-brand-600 font-medium">
                  Invite →
                </Link>
              </div>
              {overview.memberRequests.length ? (
                <ul className="divide-y text-sm">
                  {overview.memberRequests.map((inv) => (
                    <li key={inv.id} className="py-2 flex justify-between gap-3">
                      <span className="truncate">{inv.email || "Invitation"}</span>
                      <span className="text-xs text-gray-400 shrink-0">pending</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No pending invitations.</p>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">Current polls</h2>
                <Link href={`${base}/polls`} className="text-sm text-brand-600 font-medium">
                  Open polls →
                </Link>
              </div>
              {overview.polls.length ? (
                <ul className="divide-y text-sm">
                  {overview.polls.map((p) => (
                    <li key={p.id} className="py-2 truncate">
                      {p.question}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No open polls.</p>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">Exit requests</h2>
                <Link href={`${base}/exit`} className="text-sm text-brand-600 font-medium">
                  Review →
                </Link>
              </div>
              <p className="text-2xl font-semibold mb-2">{overview.totals.pendingExits}</p>
              {overview.exitRequests.length ? (
                <ul className="divide-y text-sm">
                  {overview.exitRequests.map((r) => (
                    <li key={r.id} className="py-2 flex justify-between gap-3">
                      <span className="truncate">{r.name}</span>
                      <span className="text-xs text-gray-400">{new Date(r.exitDate).toDateString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No pending exits.</p>
              )}
            </div>
          </div>
        </>
      )}

      {myRole === "MANAGER" && overview && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Today's meals"
              value={String(overview.todayMeals.breakfast + overview.todayMeals.lunch + overview.todayMeals.dinner)}
              href={`${base}/meals`}
              hint={`B ${overview.todayMeals.breakfast} · L ${overview.todayMeals.lunch} · D ${overview.todayMeals.dinner}`}
            />
            <StatCard label="Total members" value={String(overview.totals.members)} href={`${base}/members`} />
            <StatCard label="Meal balance" value={`৳${money(overview.totals.mealAdvance)}`} href={`${base}/advances`} hint="Member advances" />
            <StatCard label="Meal due" value={`৳${money(overview.totals.mealDue)}`} href={`${base}/payments`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">Due members</h2>
                <Link href={`${base}/payments`} className="text-sm text-brand-600 font-medium">
                  Record payment →
                </Link>
              </div>
              {overview.dueMembers.length ? (
                <ul className="divide-y text-sm">
                  {overview.dueMembers.slice(0, 10).map((m) => (
                    <li key={m.userId} className="py-2 flex justify-between gap-3">
                      <span className="truncate">{m.name}</span>
                      <span className="font-medium shrink-0">৳{money(m.totalDue)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">Nobody has dues right now.</p>
              )}
            </div>

            <div className="card">
              <h2 className="font-medium mb-3">Today&apos;s meal board</h2>
              {overview.todayMeals.requests.length ? (
                <ul className="divide-y text-sm">
                  {overview.todayMeals.requests.map((r) => (
                    <li key={r.userId} className="py-2 flex justify-between">
                      <span>{r.name}</span>
                      <span className="text-gray-500">
                        B:{r.breakfast} L:{r.lunch} D:{r.dinner}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No meals submitted for today yet.</p>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="font-medium mb-3">Per meal cost by month</h2>
            <MealRateChart data={overview.mealRateByMonth} />
          </div>
        </>
      )}

      {myRole === "ADMIN" && overview && (
        <div className="card">
          <h2 className="font-medium mb-3">Per meal cost by month</h2>
          <MealRateChart data={overview.mealRateByMonth} />
        </div>
      )}

      {!staff && (
        <>
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
              <Link href={`${base}/meals`} className="text-sm text-brand-600 font-medium">
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
        </>
      )}
    </div>
  );
}
