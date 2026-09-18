"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { resolvePostLoginPath } from "@/lib/postLogin";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const PENDING_SIGNUP_KEY = "mms.pendingSignup";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (emailFromQuery) return;
    try {
      const pending = JSON.parse(sessionStorage.getItem(PENDING_SIGNUP_KEY) || "null") as { email?: string } | null;
      if (pending?.email) setEmail(pending.email);
    } catch {
      /* ignore */
    }
  }, [emailFromQuery]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message || "Invalid or expired code");

      const pending = (() => {
        try {
          return JSON.parse(sessionStorage.getItem(PENDING_SIGNUP_KEY) || "null") as {
            email?: string;
            password?: string;
          } | null;
        } catch {
          return null;
        }
      })();
      const password = pending?.password;
      sessionStorage.removeItem(PENDING_SIGNUP_KEY);

      if (password && email) {
        const result = await signIn("credentials", { email, password, redirect: false });
        if (result?.error) {
          router.push("/login");
          return;
        }
        const path = await resolvePostLoginPath(callbackUrl);
        router.push(path);
        return;
      }

      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Could not verify code");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!email) return;
    setError(null);
    setResending(true);
    try {
      const res = await fetch(`${API_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message || "Could not resend code");
      setInfo("A new code was sent to your email.");
    } catch (err: any) {
      setError(err.message || "Could not resend code");
    } finally {
      setResending(false);
    }
  }

  if (!email) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="card max-w-sm w-full text-center space-y-3">
          <p className="text-sm text-gray-600">Open this page from the registration screen, or sign in if you already have an account.</p>
          <Link href="/register" className="btn-primary inline-block">
            Register
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <form onSubmit={handleSubmit} className="card max-w-sm w-full space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Enter verification code</h1>
          <p className="text-sm text-gray-500 mt-1">
            We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>. This is only needed once.
          </p>
        </div>

        <div>
          <label className="label">Code</label>
          <input
            className="input text-center tracking-[0.4em] text-lg"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}

        <button className="btn-primary w-full" disabled={loading || code.length !== 6} type="submit">
          {loading ? "Verifying…" : "Verify and continue"}
        </button>

        <button type="button" className="btn-secondary w-full" disabled={resending} onClick={resend}>
          {resending ? "Sending…" : "Resend code"}
        </button>
      </form>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>}>
      <VerifyForm />
    </Suspense>
  );
}
