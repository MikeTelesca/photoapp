"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon } from "@heroicons/react/24/outline";

export default function SignupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [validating, setValidating] = useState(true);
  const [validInvite, setValidInvite] = useState<any>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setValidInvite(data);
          if (data.email) setEmail(data.email);
        } else {
          setError(data.error || "Invalid invite");
        }
      })
      .finally(() => setValidating(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/login?signup=success");
      } else {
        setError(data.error || "Signup failed");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (validating) {
    return <div className="min-h-screen bg-graphite-50 flex items-center justify-center text-graphite-500">Validating invite...</div>;
  }

  if (!validInvite) {
    return (
      <div className="min-h-screen bg-graphite-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-graphite-200 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-600">Invalid Invite</h2>
          <p className="text-sm text-graphite-500 mt-2">{error}</p>
          <a href="/login" className="mt-4 inline-block text-sm text-cyan font-semibold">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-graphite-900 to-graphite-700 rounded-xl flex items-center justify-center shadow-lg mb-4">
            <CameraIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-graphite-900">Create Your Account</h1>
          <p className="text-sm text-graphite-400 mt-1">You've been invited as a {validInvite.role}</p>
        </div>

        <div className="bg-white rounded-2xl border border-graphite-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-graphite-700 mb-1.5 block">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-lg border border-graphite-200 text-sm focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan" />
            </div>
            <div>
              <label className="text-sm font-medium text-graphite-700 mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                disabled={!!validInvite.email}
                className="w-full px-3.5 py-2.5 rounded-lg border border-graphite-200 text-sm focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan disabled:bg-graphite-50" />
            </div>
            <div>
              <label className="text-sm font-medium text-graphite-700 mb-1.5 block">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                placeholder="At least 8 characters"
                className="w-full px-3.5 py-2.5 rounded-lg border border-graphite-200 text-sm focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan" />
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
            <button type="submit" disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-gradient-to-br from-graphite-900 to-graphite-700 text-white text-sm font-semibold disabled:opacity-50">
              {submitting ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
