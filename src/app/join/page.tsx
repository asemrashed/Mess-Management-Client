"use client";

import { AuthGate } from "@/components/AuthGate";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

function JoinMessForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/mess/join/code", { username, joinCode });
      router.push(`/mess/${username}/dashboard`);
    } catch (err: any) {
      setError(err.message || "Failed to join Mess");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-md w-full space-y-4">
      <h1 className="text-xl font-semibold">Join a Mess</h1>

      <div>
        <label className="label">Mess username</label>
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </div>

      <div>
        <label className="label">Join code</label>
        <input className="input" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button className="btn-primary w-full" disabled={loading} type="submit">
        {loading ? "Joining…" : "Join Mess"}
      </button>

      <p className="text-sm text-center text-gray-500">
        Have an invitation link instead? Just open it while signed in.
      </p>
      <p className="text-sm text-center text-gray-500">
        Want to start a new Mess?{" "}
        <Link href="/create-mess" className="text-brand-600 font-medium">
          Create one
        </Link>
      </p>
    </form>
  );
}

export default function JoinMessPage() {
  return (
    <AuthGate>
      <main className="min-h-screen flex items-center justify-center px-6 py-10">
        <JoinMessForm />
      </main>
    </AuthGate>
  );
}
