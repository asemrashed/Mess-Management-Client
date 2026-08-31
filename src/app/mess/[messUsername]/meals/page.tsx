"use client";

import { useMess } from "@/context/MessContext";
import { api, ApiError } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

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
  const { mess } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();
  const date = tomorrowIso();

  const [breakfast, setBreakfast] = useState(1);
  const [lunch, setLunch] = useState(1);
  const [dinner, setDinner] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Board polls every 8s per the master plan's suggested live-data interval for the meal board.
  const { data: board, refetch, isFetching } = useQuery({
    queryKey: ["meal-board", params.messUsername, date],
    queryFn: () => api.get<{ requests: any[]; guestMeals: any[] }>(`/mess/${params.messUsername}/meals?date=${date}`),
    refetchInterval: 8000,
  });

  const submit = useMutation({
    mutationFn: () => api.post(`/mess/${params.messUsername}/meals`, { date, breakfast, lunch, dinner }),
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      qc.invalidateQueries({ queryKey: ["meal-board", params.messUsername, date] });
      qc.invalidateQueries({ queryKey: ["meals-mine", params.messUsername] });
    },
    onError: (err: ApiError) => {
      setSuccess(false);
      if (err.code === "MEAL_DEADLINE_PASSED") setError("The deadline for tomorrow's meals has passed.");
      else if (err.code === "PAYMENT_REQUIRED") setError("You have an overdue balance — meal requests are blocked.");
      else setError(err.message);
    },
  });

  return (
    <div className="space-y-6 max-w-md">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tomorrow's Meals</h1>
        <button className="btn-secondary text-xs" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p className="text-sm text-gray-500">{new Date(date).toDateString()}</p>

      <div className="card">
        <Stepper label="Breakfast" value={breakfast} onChange={setBreakfast} />
        <Stepper label="Lunch" value={lunch} onChange={setLunch} />
        <Stepper label="Dinner" value={dinner} onChange={setDinner} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">Meals submitted.</p>}

      <button
        className="btn-primary w-full"
        onClick={() => submit.mutate()}
        disabled={submit.isPending}
      >
        {submit.isPending ? "Submitting…" : "Submit Meals"}
      </button>

      <div className="card">
        <h2 className="font-medium mb-3">Mess-wide board for {new Date(date).toDateString()}</h2>
        {board?.requests?.length ? (
          <ul className="divide-y text-sm">
            {board.requests.map((r: any) => (
              <li key={r.id} className="py-2 flex justify-between">
                <span>{r.user?.name ?? r.userId}</span>
                <span className="text-gray-500">
                  B:{r.breakfast} L:{r.lunch} D:{r.dinner}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No one has submitted yet.</p>
        )}
      </div>
    </div>
  );
}
