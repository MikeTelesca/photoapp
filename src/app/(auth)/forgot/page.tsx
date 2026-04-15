"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-graphite-50 dark:bg-graphite-900">
      <div className="bg-white dark:bg-graphite-800 rounded-lg shadow-lg p-8 max-w-sm w-full">
        <h1 className="text-xl font-bold mb-4 dark:text-white">Reset password</h1>
        {submitted ? (
          <div className="space-y-3 text-sm text-graphite-600 dark:text-graphite-300">
            <p>If an account exists for <strong>{email}</strong>, a reset link has been sent. Check your email.</p>
            <Link href="/login" className="text-cyan hover:underline text-xs">← Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-graphite-600 dark:text-graphite-300">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="you@example.com"
              className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-900 dark:text-white" />
            <button type="submit" disabled={loading || !email}
              className="w-full text-sm px-4 py-2 rounded bg-cyan text-white font-semibold">
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <Link href="/login" className="text-cyan hover:underline text-xs block text-center">← Back to sign in</Link>
          </form>
        )}
      </div>
    </div>
  );
}
