"use client";

import { AuthGate } from "@/components/AuthGate";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

function CreateMessForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { mess } = await api.post<{ mess: { username: string } }>("/mess", {
        name,
        username,
        description: description || undefined,
      });
      router.push(`/mess/${mess.username}/dashboard`);
    } catch (err: any) {
      setError(err.message || "Failed to create Mess");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-md w-full space-y-4">
      <h1 className="text-xl font-semibold">Create a Mess</h1>

      <div>
        <label className="label">Mess name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <label className="label">Mess username (used in the URL)</label>
        <input
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          pattern="[a-z0-9-]+"
          placeholder="e.g. green-road-mess"
          required
        />
      </div>

      <div>
        <label className="label">Description (optional)</label>
        <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button className="btn-primary w-full" disabled={loading} type="submit">
        {loading ? "Creating…" : "Create Mess"}
      </button>

      <p className="text-sm text-center text-gray-500">
        Joining an existing Mess instead?{" "}
        <Link href="/join" className="text-brand-600 font-medium">
          Join here
        </Link>
      </p>
    </form>
  );
}

export default function CreateMessPage() {
  return (
    <AuthGate>
      <main className="min-h-screen flex items-center justify-center px-6 py-10 relative">
        <button
          type="button"
          className="absolute top-4 right-4 btn-secondary text-sm"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
        <CreateMessForm />
      </main>
    </AuthGate>
  );
}
