"use client";

import { AuthGate } from "@/components/AuthGate";
import { resolvePostLoginPath } from "@/lib/postLogin";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function HomeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    resolvePostLoginPath(searchParams.get("callbackUrl")).then((path) => router.replace(path));
  }, [router, searchParams]);

  return <p className="text-sm text-gray-500 text-center">Taking you to your mess…</p>;
}

export default function HomePage() {
  return (
    <AuthGate>
      <main className="min-h-screen flex items-center justify-center px-6">
        <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
          <HomeRedirect />
        </Suspense>
      </main>
    </AuthGate>
  );
}
