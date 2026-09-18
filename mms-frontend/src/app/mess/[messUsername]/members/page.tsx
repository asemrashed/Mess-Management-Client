"use client";

import { useMess } from "@/context/MessContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

type Invitation = {
  id: string;
  email: string | null;
  token: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

export default function MembersPage() {
  const { myRole, mess } = useMess();
  const params = useParams<{ messUsername: string }>();
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<{ userId: string; role: string; name: string } | null>(null);

  const { data } = useQuery({
    queryKey: ["members", params.messUsername],
    queryFn: () => api.get<{ members: any[] }>(`/mess/${params.messUsername}/members`),
  });

  const { data: inviteData } = useQuery({
    queryKey: ["invitations", params.messUsername],
    queryFn: () => api.get<{ invitations: Invitation[] }>(`/mess/${params.messUsername}/invitations`),
    enabled: myRole === "ADMIN",
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/mess/${params.messUsername}/members/${userId}/role`, { role }),
    onSuccess: () => {
      setPendingRole(null);
      qc.invalidateQueries({ queryKey: ["members", params.messUsername] });
    },
  });

  const invite = useMutation({
    mutationFn: () => api.post<{ invitation: Invitation }>(`/mess/${params.messUsername}/invitations`, { email: inviteEmail }),
    onSuccess: () => {
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["invitations", params.messUsername] });
    },
  });

  function inviteLink(token: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/join/invite/${token}`;
  }

  async function copyLink(invitation: Invitation) {
    await navigator.clipboard.writeText(inviteLink(invitation.token));
    setCopiedId(invitation.id);
    setTimeout(() => setCopiedId((id) => (id === invitation.id ? null : id)), 2000);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Members</h1>
        {myRole === "ADMIN" && mess && <span className="text-xs text-gray-400">Join code: {mess.joinCode}</span>}
      </div>

      {myRole === "ADMIN" && (
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            invite.mutate();
          }}
        >
          <h2 className="font-medium text-sm">Invite by Gmail</h2>
          <p className="text-xs text-gray-500">
            Send a join link to someone&apos;s Gmail. They must sign in with that same email to accept.
          </p>
          <div>
            <label className="label">Gmail address</label>
            <input
              className="input"
              type="email"
              placeholder="friend@gmail.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          {invite.isError && (
            <p className="text-sm text-red-600">{(invite.error as Error)?.message || "Could not send invitation"}</p>
          )}
          {invite.isSuccess && (
            <p className="text-sm text-green-700">Invitation sent. They can also use the link below.</p>
          )}
          <button className="btn-primary w-full" disabled={invite.isPending} type="submit">
            {invite.isPending ? "Sending…" : "Send invitation"}
          </button>
        </form>
      )}

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
                  onChange={(e) => setPendingRole({ userId: m.user.id, role: e.target.value, name: m.user.name })}
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

      {myRole === "ADMIN" && (
        <div className="card">
          <h2 className="font-medium text-sm mb-3">Sent invitations</h2>
          <ul className="divide-y text-sm">
            {inviteData?.invitations?.map((invitation) => (
              <li key={invitation.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{invitation.email || "Open link"}</p>
                  <p className="text-xs text-gray-400">
                    {invitation.status} · expires {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                {invitation.status === "ACTIVE" && (
                  <button className="btn-secondary text-xs shrink-0" type="button" onClick={() => copyLink(invitation)}>
                    {copiedId === invitation.id ? "Copied" : "Copy link"}
                  </button>
                )}
              </li>
            ))}
            {!inviteData?.invitations?.length && (
              <p className="text-sm text-gray-400 py-2">No invitations sent yet.</p>
            )}
          </ul>
        </div>
      )}

      <ConfirmModal
        open={!!pendingRole}
        title="Change this member's role?"
        message={
          pendingRole
            ? `${pendingRole.name} will become ${pendingRole.role}. Managers keep meals, groceries, and meal payments unless you change that in Settings.`
            : ""
        }
        confirmLabel="Change role"
        pending={changeRole.isPending}
        onConfirm={() => pendingRole && changeRole.mutate({ userId: pendingRole.userId, role: pendingRole.role })}
        onCancel={() => setPendingRole(null)}
      />
    </div>
  );
}
