"use client";

import { AuthGate } from "@/components/AuthGate";
import { api } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

function InviteJoiner() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { mess } = await api.post<{ mess: { username: string } }>(`/mess/join/invite/${params.token}`);
        router.replace(`/mess/${mess.username}/dashboard`);
      } catch (err: any) {
        setError(err.message || "This invitation link is invalid or has expired.");
      }
    })();
  }, [params.token, router]);

  if (error) {
    return <p className="text-sm text-red-600 text-center">{error}</p>;
  }
  return <p className="text-sm text-gray-500 text-center">Joining Mess…</p>;
}

export default function InvitePage() {
  return (
    <AuthGate>
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="card max-w-sm w-full">
          <InviteJoiner />
        </div>
      </main>
    </AuthGate>
  );
}
