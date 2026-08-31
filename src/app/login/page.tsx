"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "api_auth") {
      setError("Your session expired or could not reach the API. Please sign in again.");
    }
  }, []);

  useEffect(() => {
    const apiAccessToken = (session as { apiAccessToken?: string } | null)?.apiAccessToken;
    if (status === "authenticated" && apiAccessToken) {
      router.replace("/create-mess");
    }
  }, [status, session, router]);

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/create-mess");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="card max-w-sm w-full space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Sign in to MMS</h1>
          <p className="text-sm text-gray-500 mt-1">Use Google or your email and password.</p>
        </div>

        <button className="btn-secondary w-full" onClick={() => signIn("google")}>
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
          <Link href="/register" className="text-brand-600 font-medium">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
