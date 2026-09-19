"use client";

import { useMess } from "@/context/MessContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { api, ApiError } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="w-8 h-8 rounded-full border text-lg leading-none flex items-center justify-center hover:bg-gray-50"
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          −
        </button>
        <span className="w-6 text-center">{value}</span>
        <button
          type="button"
          className="w-8 h-8 rounded-full border text-lg leading-none flex items-center justify-center hover:bg-gray-50"
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function MealsPage() {
  const { can } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const myId = (session as any)?.apiUser?.id as string | undefined;
  const canManage = can("meals");

  const [date, setDate] = useState(tomorrowIso());
  const [breakfast, setBreakfast] = useState(1);
  const [lunch, setLunch] = useState(1);
  const [dinner, setDinner] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [edit, setEdit] = useState<{ id: string; userId: string; breakfast: number; lunch: number; dinner: number } | null>(
    null
  );
  const [confirm, setConfirm] = useState<
    | { kind: "submit" }
    | { kind: "save"; id: string }
    | { kind: "delete"; id: string }
    | null
  >(null);

  const { data: board, refetch, isFetching } = useQuery({
    queryKey: ["meal-board", params.messUsername, date],
    queryFn: () => api.get<{ requests: any[]; guestMeals: any[] }>(`/mess/${params.messUsername}/meals?date=${date}`),
    refetchInterval: 8000,
  });

  const { data: members } = useQuery({
    queryKey: ["members", params.messUsername],
    queryFn: () => api.get<{ members: any[] }>(`/mess/${params.messUsername}/members`),
    enabled: canManage,
  });

  const submit = useMutation({
    mutationFn: (userId?: string) =>
      api.post(`/mess/${params.messUsername}/meals`, {
        date,
        breakfast,
        lunch,
        dinner,
        ...(userId ? { userId } : {}),
      }),
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["meal-board", params.messUsername, date] });
      qc.invalidateQueries({ queryKey: ["meals-mine", params.messUsername] });
    },
    onError: (err: ApiError) => {
      setSuccess(false);
      setConfirm(null);
      if (err.code === "MEAL_DEADLINE_PASSED") setError("The deadline for tomorrow's meals has passed.");
      else if (err.code === "PAYMENT_REQUIRED") setError("You have an overdue balance — meal requests are blocked.");
      else setError(err.message);
    },
  });

  const override = useMutation({
    mutationFn: (payload: { id: string; breakfast: number; lunch: number; dinner: number }) =>
      canManage
        ? api.patch(`/mess/${params.messUsername}/meals/${payload.id}/override`, {
            breakfast: payload.breakfast,
            lunch: payload.lunch,
            dinner: payload.dinner,
            reason: "Corrected by manager/admin",
          })
        : api.post(`/mess/${params.messUsername}/meals`, {
            date,
            breakfast: payload.breakfast,
            lunch: payload.lunch,
            dinner: payload.dinner,
          }),
    onSuccess: () => {
      setEdit(null);
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["meal-board", params.messUsername, date] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/mess/${params.messUsername}/meals/${id}`),
    onSuccess: () => {
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["meal-board", params.messUsername, date] });
    },
  });

  const [forMemberId, setForMemberId] = useState("");

  return (
    <div className="space-y-6 max-w-md">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Meals</h1>
        <button className="btn-secondary text-xs" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div>
        <label className="label">Date</label>
        <input className="input max-w-[12rem]" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="card">
        <Stepper label="Breakfast" value={breakfast} onChange={setBreakfast} />
        <Stepper label="Lunch" value={lunch} onChange={setLunch} />
        <Stepper label="Dinner" value={dinner} onChange={setDinner} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">Meals submitted.</p>}

      <button className="btn-primary w-full" onClick={() => setConfirm({ kind: "submit" })} disabled={submit.isPending}>
        {submit.isPending ? "Submitting…" : "Submit my meals"}
      </button>

      {canManage && (
        <div className="card space-y-3">
          <h2 className="font-medium text-sm">Set meals for a member</h2>
          <select className="input" value={forMemberId} onChange={(e) => setForMemberId(e.target.value)}>
            <option value="">Select member…</option>
            {members?.members?.map((m: any) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name}
              </option>
            ))}
          </select>
          <button
            className="btn-secondary w-full"
            disabled={!forMemberId || submit.isPending}
            onClick={() => submit.mutate(forMemberId)}
          >
            Apply counts to member
          </button>
        </div>
      )}

      <div className="card">
        <h2 className="font-medium mb-3">Board for {new Date(date).toDateString()}</h2>
        {board?.requests?.length ? (
          <ul className="divide-y text-sm">
            {board.requests.map((r: any) => {
              const editingRow = edit?.id === r.id ? edit : null;
              return (
              <li key={r.id} className="py-2 space-y-2">
                <div className="flex justify-between gap-2">
                  <span>{r.user?.name ?? r.userId}</span>
                  <span className="text-gray-500">
                    B:{r.breakfast} L:{r.lunch} D:{r.dinner}
                  </span>
                </div>
                {editingRow ? (
                  <div className="rounded-lg border p-2 bg-gray-50">
                    <Stepper label="Breakfast" value={editingRow.breakfast} onChange={(v) => setEdit({ ...editingRow, breakfast: v })} />
                    <Stepper label="Lunch" value={editingRow.lunch} onChange={(v) => setEdit({ ...editingRow, lunch: v })} />
                    <Stepper label="Dinner" value={editingRow.dinner} onChange={(v) => setEdit({ ...editingRow, dinner: v })} />
                    <div className="flex gap-2 mt-2">
                      <button className="btn-secondary text-xs" onClick={() => setEdit(null)}>
                        Cancel
                      </button>
                      <button className="btn-primary text-xs" onClick={() => setConfirm({ kind: "save", id: r.id })}>
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  (canManage || r.userId === myId) && (
                    <div className="flex gap-2">
                      <button
                        className="btn-secondary text-xs"
                        onClick={() =>
                          setEdit({
                            id: r.id,
                            userId: r.userId,
                            breakfast: r.breakfast,
                            lunch: r.lunch,
                            dinner: r.dinner,
                          })
                        }
                      >
                        Edit
                      </button>
                      <button className="text-xs text-red-600 hover:underline" onClick={() => setConfirm({ kind: "delete", id: r.id })}>
                        Delete
                      </button>
                    </div>
                  )
                )}
              </li>
            );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No one has submitted yet.</p>
        )}
      </div>

      <ConfirmModal
        open={confirm?.kind === "submit"}
        title="Submit these meals?"
        message={`Breakfast ${breakfast}, lunch ${lunch}, dinner ${dinner} for ${new Date(date).toDateString()}.`}
        confirmLabel="Submit"
        pending={submit.isPending}
        onConfirm={() => submit.mutate(undefined)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.kind === "save"}
        title="Save meal changes?"
        message="This will override the recorded meal counts."
        confirmLabel="Save"
        pending={override.isPending}
        onConfirm={() => edit && override.mutate(edit)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.kind === "delete"}
        title="Delete this meal entry?"
        message="This cannot be undone."
        confirmLabel="Delete"
        danger
        pending={remove.isPending}
        onConfirm={() => confirm?.kind === "delete" && remove.mutate(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
