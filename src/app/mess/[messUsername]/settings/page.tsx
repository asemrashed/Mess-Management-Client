"use client";

import { useMess } from "@/context/MessContext";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

const TOGGLES: { key: string; label: string }[] = [
  { key: "mealManagementEnabled", label: "Meal Management" },
  { key: "groceryEnabled", label: "Grocery" },
  { key: "rentEnabled", label: "Rent / Bills" },
  { key: "utilityEnabled", label: "Utilities" },
  { key: "pollsEnabled", label: "Polls" },
  { key: "notesEnabled", label: "Notes" },
  { key: "routinesEnabled", label: "Routines" },
  { key: "exitManagementEnabled", label: "Exit Management" },
  { key: "notificationsEnabled", label: "Notifications" },
  { key: "guestMealsEnabled", label: "Guest Meals" },
  { key: "blockMealsWhenOverdue", label: "Block Meals When Overdue" },
];

export default function SettingsPage() {
  const { mess } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (mess?.settings) setForm(mess.settings);
  }, [mess]);

  const save = useMutation({
    mutationFn: () => api.patch(`/mess/${params.messUsername}/settings`, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mess", params.messUsername] }),
  });

  const { data: periods } = useQuery({
    queryKey: ["periods", params.messUsername],
    queryFn: () => api.get<{ periods: any[] }>(`/mess/${params.messUsername}/periods`),
  });

  const openPeriod = useMutation({
    mutationFn: () => {
      const now = new Date();
      return api.post(`/mess/${params.messUsername}/periods`, {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["periods", params.messUsername] }),
  });

  const closePeriod = useMutation({
    mutationFn: (id: string) => api.post(`/mess/${params.messUsername}/periods/${id}/close`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["periods", params.messUsername] }),
  });

  if (!mess) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Mess Settings</h1>

      <div className="card space-y-3">
        <h2 className="font-medium text-sm">Feature toggles</h2>
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex items-center justify-between text-sm py-1">
            {t.label}
            <input
              type="checkbox"
              checked={!!form[t.key]}
              onChange={(e) => setForm((f) => ({ ...f, [t.key]: e.target.checked }))}
            />
          </label>
        ))}

        <div>
          <label className="label">Meal deadline hour (0-23, mess timezone)</label>
          <input
            className="input"
            type="number"
            min={0}
            max={23}
            value={form.mealDeadlineHour ?? 22}
            onChange={(e) => setForm((f) => ({ ...f, mealDeadlineHour: Number(e.target.value) }))}
          />
        </div>

        <div>
          <label className="label">Payment grace period (days)</label>
          <input
            className="input"
            type="number"
            min={0}
            value={form.paymentGraceDays ?? 10}
            onChange={(e) => setForm((f) => ({ ...f, paymentGraceDays: Number(e.target.value) }))}
          />
        </div>

        <button className="btn-primary w-full" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save Settings"}
        </button>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm">Accounting periods</h2>
          <button className="btn-secondary text-xs" onClick={() => openPeriod.mutate()} disabled={openPeriod.isPending}>
            Open current month
          </button>
        </div>
        <ul className="divide-y text-sm">
          {periods?.periods?.map((p: any) => (
            <li key={p.id} className="py-2 flex items-center justify-between">
              <span>
                {p.year}-{String(p.month).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-2">
                <span className="badge bg-gray-100 text-gray-700">{p.status}</span>
                {p.status === "OPEN" && (
                  <button className="btn-danger text-xs" onClick={() => closePeriod.mutate(p.id)} disabled={closePeriod.isPending}>
                    Close & Generate Statements
                  </button>
                )}
              </div>
            </li>
          ))}
          {!periods?.periods?.length && <p className="text-sm text-gray-400">No accounting periods yet.</p>}
        </ul>
      </div>
    </div>
  );
}
