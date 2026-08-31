"use client";

import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export default function ReportsPage() {
  const params = useParams<{ messUsername: string }>();

  const { data: mealReport } = useQuery({
    queryKey: ["report-meals", params.messUsername],
    queryFn: () => api.get<{ memberTotals: any[]; period: any }>(`/mess/${params.messUsername}/reports/meals`),
  });

  const { data: financeReport } = useQuery({
    queryKey: ["report-finance", params.messUsername],
    queryFn: () => api.get<{ statements: any[] }>(`/mess/${params.messUsername}/reports/finance`),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Reports</h1>
        <a
          className="btn-secondary text-sm"
          href={`${process.env.NEXT_PUBLIC_API_URL}/mess/${params.messUsername}/reports/groceries.csv`}
          target="_blank"
        >
          Export Groceries CSV
        </a>
      </div>

      <div className="card">
        <h2 className="font-medium mb-3">
          Meal totals {mealReport?.period ? `— ${mealReport.period.year}-${String(mealReport.period.month).padStart(2, "0")}` : ""}
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-2">Member</th>
              <th className="pb-2">B</th>
              <th className="pb-2">L</th>
              <th className="pb-2">D</th>
              <th className="pb-2">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mealReport?.memberTotals?.map((m: any) => (
              <tr key={m.userId}>
                <td className="py-1.5">{m.name}</td>
                <td className="py-1.5">{m.breakfast}</td>
                <td className="py-1.5">{m.lunch}</td>
                <td className="py-1.5">{m.dinner}</td>
                <td className="py-1.5 font-medium">{m.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!mealReport?.memberTotals?.length && <p className="text-sm text-gray-400">No meal data for this period.</p>}
      </div>

      <div className="card">
        <h2 className="font-medium mb-3">Finance statements</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-2">Member</th>
              <th className="pb-2">Meal charge</th>
              <th className="pb-2">Bill charge</th>
              <th className="pb-2">Total due</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {financeReport?.statements?.map((s: any) => (
              <tr key={s.id}>
                <td className="py-1.5">{s.user?.name}</td>
                <td className="py-1.5">৳{s.mealCharge}</td>
                <td className="py-1.5">৳{s.billCharge}</td>
                <td className="py-1.5 font-medium">৳{s.totalDue}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!financeReport?.statements?.length && <p className="text-sm text-gray-400">No statements generated yet.</p>}
      </div>
    </div>
  );
}
