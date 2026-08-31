"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Wrap any authenticated page's content in this to redirect signed-out users to /login. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>;
  }
  if (status === "unauthenticated") return null;

  return <>{children}</>;
}
