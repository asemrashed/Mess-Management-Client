"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { googleCallbackUrl, resolvePostLoginPath } from "@/lib/postLogin";
import { isGenericLanding, safeCallbackUrl } from "@/lib/urls";

function LoginForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiAccessToken = (session as { apiAccessToken?: string } | null)?.apiAccessToken;
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !apiAccessToken) return;
    resolvePostLoginPath(searchParams.get("callbackUrl")).then((path) => router.replace(path));
  }, [status, apiAccessToken, router, searchParams]);

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setLoading(false);
      setError(result.error);
      return;
    }
    const path = await resolvePostLoginPath(searchParams.get("callbackUrl"));
    setLoading(false);
    router.push(path);
  }

  const registerHref = isGenericLanding(callbackUrl)
    ? "/register"
    : `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="card max-w-sm w-full space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Sign in to MMS</h1>
          <p className="text-sm text-gray-500 mt-1">Use Google or your email and password.</p>
        </div>

        <button className="btn-secondary w-full" onClick={() => signIn("google", { callbackUrl: googleCallbackUrl(callbackUrl) })}>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="h-px bg-gray-200 flex-1" />
          or
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <form onSubmit={handleCredentialsLogin} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-brand-600">
              Forgot password?
            </Link>
          </div>

          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href={registerHref} className="text-brand-600 font-medium">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
