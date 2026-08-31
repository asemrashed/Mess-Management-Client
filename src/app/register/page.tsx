"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function RegisterPage() {
  const { status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/create-mess");
  }, [status, router]);

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

      setRegistered(true);
      // Immediately sign in via the credentials provider so the app is usable right away,
      // while the verification email is on its way in the background.
      await signIn("credentials", { email, password, redirect: false });
      router.push("/create-mess");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="card max-w-sm w-full space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Or use Google from the sign-in page instead.</p>
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
          {registered && <p className="text-sm text-green-600">Account created — check your email to verify it.</p>}

          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-600 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
