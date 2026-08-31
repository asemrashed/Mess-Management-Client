"use client";

import { useMess } from "@/context/MessContext";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export default function MembersPage() {
  const { myRole, mess } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["members", params.messUsername],
    queryFn: () => api.get<{ members: any[] }>(`/mess/${params.messUsername}/members`),
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/mess/${params.messUsername}/members/${userId}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", params.messUsername] }),
  });

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Members</h1>
        {myRole === "ADMIN" && mess && <span className="text-xs text-gray-400">Join code: {mess.joinCode}</span>}
      </div>

      <div className="card">
        <ul className="divide-y text-sm">
          {data?.members?.map((m: any) => (
            <li key={m.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{m.user.name}</p>
                <p className="text-xs text-gray-400">{m.user.phone ?? m.user.email}</p>
              </div>
              {myRole === "ADMIN" ? (
                <select
                  className="input w-32 text-xs"
                  value={m.role}
                  onChange={(e) => changeRole.mutate({ userId: m.user.id, role: e.target.value })}
                >
                  {["ADMIN", "MANAGER", "MEMBER"].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="badge bg-brand-100 text-brand-700">{m.role}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
