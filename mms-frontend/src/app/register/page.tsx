"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { resolvePostLoginPath } from "@/lib/postLogin";
import { isGenericLanding, safeCallbackUrl } from "@/lib/urls";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const PENDING_SIGNUP_KEY = "mms.pendingSignup";

function RegisterForm() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      resolvePostLoginPath(searchParams.get("callbackUrl")).then((path) => router.replace(path));
    }
  }, [status, router, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Registration failed");

      sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify({ email, password }));
      const next = isGenericLanding(callbackUrl)
        ? `/verify?email=${encodeURIComponent(email)}`
        : `/verify?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
      router.push(next);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const loginHref = isGenericLanding(callbackUrl) ? "/login" : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="card max-w-sm w-full space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">We&apos;ll email a 6-digit code to confirm it&apos;s you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? "Sending code…" : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500">
          Already have an account?{" "}
          <Link href={loginHref} className="text-brand-600 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
