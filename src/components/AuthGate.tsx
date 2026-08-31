"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Wrap any authenticated page's content in this to redirect signed-out users to /login. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const apiAccessToken = (session as { apiAccessToken?: string } | null)?.apiAccessToken;
  const apiError = (session as { apiError?: string } | null)?.apiError;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    // NextAuth can be "authenticated" without a backend JWT if the /auth/google exchange failed
    // (e.g. while the API was down). API calls would then hit the backend with no Bearer token → 401.
    if (status === "authenticated" && (!apiAccessToken || apiError)) {
      void signOut({ callbackUrl: "/login?error=api_auth" });
    }
  }, [status, apiAccessToken, apiError, router]);

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>;
  }
  if (status === "unauthenticated" || !apiAccessToken || apiError) return null;

  return <>{children}</>;
}
