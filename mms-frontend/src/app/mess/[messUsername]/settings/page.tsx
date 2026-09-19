"use client";

import { useMess } from "@/context/MessContext";
import { ConfirmModal } from "@/components/ConfirmModal";
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

const MANAGER_TOGGLES: { key: string; label: string; hint: string }[] = [
  { key: "managerCanMeals", label: "Meals", hint: "Full control of the meal board, overrides, and guest meals." },
  { key: "managerCanGrocery", label: "Groceries", hint: "Approve, edit, and delete grocery purchases." },
  {
    key: "managerCanMealFinance",
    label: "Meal payments & advances",
    hint: "Record, edit, and delete meal payments and member advances. Not rent or other bills.",
  },
  { key: "managerCanRent", label: "Rent", hint: "Rent bills and rent payments." },
  { key: "managerCanWifi", label: "WiFi", hint: "WiFi bills." },
  { key: "managerCanUtilities", label: "Utilities", hint: "Electricity, water, and gas bills." },
  { key: "managerCanOtherBills", label: "Other bills", hint: "Maid, cleaning, and other bill categories." },
];

export default function SettingsPage() {
  const { mess } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>({});
  const [confirm, setConfirm] = useState<"save" | { closeId: string } | { reopenId: string } | null>(null);

  useEffect(() => {
    if (mess?.settings) {
      setForm({
        ...mess.settings,
        managerCanMeals: mess.settings.managerCanMeals ?? true,
        managerCanGrocery: mess.settings.managerCanGrocery ?? true,
        managerCanMealFinance: mess.settings.managerCanMealFinance ?? true,
        managerCanRent: mess.settings.managerCanRent ?? false,
        managerCanWifi: mess.settings.managerCanWifi ?? false,
        managerCanUtilities: mess.settings.managerCanUtilities ?? false,
        managerCanOtherBills: mess.settings.managerCanOtherBills ?? false,
      });
    }
  }, [mess]);

  const save = useMutation({
    mutationFn: () => api.patch(`/mess/${params.messUsername}/settings`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess", params.messUsername] });
      setConfirm(null);
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["periods", params.messUsername] });
      setConfirm(null);
    },
  });

  const reopenPeriod = useMutation({
    mutationFn: (id: string) => api.post(`/mess/${params.messUsername}/periods/${id}/reopen`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["periods", params.messUsername] });
      setConfirm(null);
    },
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
      </div>

      <div className="card space-y-3">
        <div>
          <h2 className="font-medium text-sm">Manager permissions</h2>
          <p className="text-xs text-gray-500 mt-1">
            Admins can always do everything. Managers always start with meals, groceries, and meal
            payments/advances. Turn extra areas on if you want them handling rent, WiFi, or other bills.
          </p>
        </div>
        {MANAGER_TOGGLES.map((t) => (
          <label key={t.key} className="flex items-start justify-between gap-3 text-sm py-1">
            <span>
              {t.label}
              <span className="block text-xs text-gray-500 font-normal">{t.hint}</span>
            </span>
            <input
              type="checkbox"
              className="mt-1"
              checked={!!form[t.key]}
              onChange={(e) => setForm((f) => ({ ...f, [t.key]: e.target.checked }))}
            />
          </label>
        ))}
      </div>

      <button className="btn-primary w-full" disabled={save.isPending} onClick={() => setConfirm("save")}>
        {save.isPending ? "Saving…" : "Save Settings"}
      </button>
      {save.isError && (
        <p className="text-sm text-red-600">{(save.error as Error)?.message || "Could not save settings"}</p>
      )}

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm">Accounting periods</h2>
          <button className="btn-secondary text-xs" onClick={() => openPeriod.mutate()} disabled={openPeriod.isPending}>
            Open current month
          </button>
        </div>
        {openPeriod.isError && (
          <p className="text-sm text-red-600">{(openPeriod.error as Error)?.message || "Could not open period"}</p>
        )}
        {reopenPeriod.isError && (
          <p className="text-sm text-red-600">{(reopenPeriod.error as Error)?.message || "Could not reopen period"}</p>
        )}
        <ul className="divide-y text-sm">
          {periods?.periods?.map((p: any) => (
            <li key={p.id} className="py-2 flex items-center justify-between">
              <span>
                {p.year}-{String(p.month).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-2">
                <span className="badge bg-gray-100 text-gray-700">{p.status}</span>
                {p.status === "OPEN" && (
                  <button
                    className="btn-danger text-xs"
                    onClick={() => setConfirm({ closeId: p.id })}
                    disabled={closePeriod.isPending}
                  >
                    Close & Generate Statements
                  </button>
                )}
                {(p.status === "CLOSED" || p.status === "CLOSING") && (
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => setConfirm({ reopenId: p.id })}
                    disabled={reopenPeriod.isPending}
                  >
                    Reopen
                  </button>
                )}
              </div>
            </li>
          ))}
          {!periods?.periods?.length && <p className="text-sm text-gray-400">No accounting periods yet.</p>}
        </ul>
      </div>

      <ConfirmModal
        open={confirm === "save"}
        title="Save settings?"
        message="This updates feature toggles and what the manager is allowed to do."
        confirmLabel="Save"
        pending={save.isPending}
        onConfirm={() => save.mutate()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={typeof confirm === "object" && confirm !== null && "closeId" in confirm}
        title="Close this accounting period?"
        message="Statements will be generated and this month will be locked. You can reopen it later as admin if something still needs recording."
        confirmLabel="Close period"
        danger
        pending={closePeriod.isPending}
        onConfirm={() => typeof confirm === "object" && confirm && "closeId" in confirm && closePeriod.mutate(confirm.closeId)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={typeof confirm === "object" && confirm !== null && "reopenId" in confirm}
        title="Reopen this accounting period?"
        message="Groceries and bills can be added again. Previous statements become draft and will be regenerated on the next close."
        confirmLabel="Reopen period"
        pending={reopenPeriod.isPending}
        onConfirm={() => typeof confirm === "object" && confirm && "reopenId" in confirm && reopenPeriod.mutate(confirm.reopenId)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
