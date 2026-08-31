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
        const { membership } = await api.post<{ membership: { messId: string } }>(
          `/mess/join/invite/${params.token}`
        );
        // The API doesn't return the mess username on this route; send members to /create-mess
        // as a safe landing spot if they don't already know it, otherwise adjust this redirect
        // to whatever your invite flow encodes in the link.
        router.replace(`/create-mess`);
        void membership;
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
