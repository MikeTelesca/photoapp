"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setError(data.error || "Failed");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-graphite-50 dark:bg-graphite-900">
        <div className="bg-white dark:bg-graphite-800 rounded-lg shadow-lg p-8 max-w-sm w-full">
          <h1 className="text-xl font-bold mb-3 dark:text-white">Invalid link</h1>
          <p className="text-sm text-graphite-600 dark:text-graphite-300">This reset link is missing a token.</p>
          <Link href="/forgot" className="text-cyan hover:underline text-xs mt-3 block">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-graphite-50 dark:bg-graphite-900">
      <div className="bg-white dark:bg-graphite-800 rounded-lg shadow-lg p-8 max-w-sm w-full">
        <h1 className="text-xl font-bold mb-4 dark:text-white">Set new password</h1>
        {success ? (
          <div className="space-y-3 text-sm text-emerald-600 dark:text-emerald-400">
            Password updated! Redirecting to sign in...
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              placeholder="New password"
              className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-900 dark:text-white" />
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
              placeholder="Confirm password"
              className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-900 dark:text-white" />
            {error && <div className="text-xs text-red-500">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full text-sm px-4 py-2 rounded bg-cyan text-white font-semibold">
              {loading ? "Saving..." : "Set password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-graphite-50 dark:bg-graphite-900">
        <div className="bg-white dark:bg-graphite-800 rounded-lg shadow-lg p-8 max-w-sm w-full">
          <p className="text-sm text-graphite-600 dark:text-graphite-300">Loading...</p>
        </div>
      </div>
    }>
      <ResetForm />
    </Suspense>
  );
}
