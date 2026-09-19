"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function VerifyEmailPage() {
  const params = useParams<{ token: string }>();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: params.token }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error?.message || "Verification failed");
        setStatus("success");
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message);
      }
    })();
  }, [params.token]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card max-w-sm w-full text-center space-y-3">
        {status === "pending" && <p className="text-sm text-gray-500">Verifying your email…</p>}
        {status === "success" && <p className="text-sm text-green-600">Your email has been verified.</p>}
        {status === "error" && <p className="text-sm text-red-600">{message}</p>}

        <Link href="/login" className="btn-primary inline-block mt-2">
          Go to sign in
        </Link>
      </div>
    </main>
  );
}
