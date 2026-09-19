"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Wrap any authenticated page's content in this to redirect signed-out users to /login. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const apiAccessToken = (session as { apiAccessToken?: string } | null)?.apiAccessToken;
  const refreshAttempted = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      refreshAttempted.current = false;
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?callbackUrl=${encodeURIComponent(next)}`);
      return;
    }

    if (status !== "authenticated" || apiAccessToken || refreshAttempted.current) return;

    refreshAttempted.current = true;
    void (async () => {
      const updated = await update();
      const token = (updated as { apiAccessToken?: string } | null)?.apiAccessToken;
      if (!token) {
        signOut({ callbackUrl: "/login" });
      }
    })();
  }, [status, apiAccessToken, router, update]);

  if (status === "loading" || (status === "authenticated" && !apiAccessToken)) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>;
  }
  if (status === "unauthenticated") return null;

  return <>{children}</>;
}
