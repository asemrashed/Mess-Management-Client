"use client";

import { useMess } from "@/context/MessContext";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const STATUS_COLOR: Record<string, string> = {
  UPCOMING: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  MISSED: "bg-red-100 text-red-700",
};

export default function RoutinesPage() {
  const { myRole } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["routines", params.messUsername],
    queryFn: () => api.get<{ routines: any[] }>(`/mess/${params.messUsername}/routines`),
  });

  const complete = useMutation({
    mutationFn: (assignmentId: string) =>
      api.patch(`/mess/${params.messUsername}/routines/assignments/${assignmentId}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routines", params.messUsername] }),
  });

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Routines</h1>
      {myRole === "ADMIN" && (
        <p className="text-sm text-gray-500">
          Creating routines with rotation schedules is available via the API (
          <code>POST /mess/{params.messUsername}/routines</code>) — build out a dedicated form here
          for your household's specific recurrence needs.
        </p>
      )}

      <div className="space-y-4">
        {data?.routines?.map((r: any) => (
          <div key={r.id} className="card">
            <p className="font-medium mb-2">{r.title}</p>
            <p className="text-xs text-gray-400 mb-3">{r.recurrenceRule}</p>
            <ul className="divide-y text-sm">
              {r.assignments?.map((a: any) => (
                <li key={a.id} className="py-2 flex items-center justify-between gap-2">
                  <span>
                    {a.periodLabel} — {a.user?.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${STATUS_COLOR[a.status]}`}>{a.status}</span>
                    {a.status !== "COMPLETED" && (
                      <button className="btn-secondary text-xs" onClick={() => complete.mutate(a.id)}>
                        Mark done
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!data?.routines?.length && <p className="text-sm text-gray-400">No routines set up yet.</p>}
      </div>
    </div>
  );
}
