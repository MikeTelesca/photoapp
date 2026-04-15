"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CameraIcon } from "@heroicons/react/24/outline";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const emailParam = searchParams?.get("email");
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        twoFactorCode: show2FA ? twoFactorCode : undefined,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes("2FA_REQUIRED")) {
          setShow2FA(true);
          setError("");
        } else if (result.error.includes("Invalid 2FA code")) {
          setError("Invalid authenticator code. Please try again.");
        } else {
          setError("Invalid email or password");
        }
      } else {
        // If user came from signup flow, direct them to guided first job flow
        const isFromSignup = searchParams?.get("email");
        router.push(isFromSignup ? "/jobs/new?welcome=1" : "/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-graphite-50 via-white to-cyan-50/40 dark:from-graphite-950 dark:via-graphite-950 dark:to-cyan-950/20 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4">
            <CameraIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-graphite-900 dark:text-white tracking-tight">ATH AI Editor</h1>
          <p className="text-sm text-graphite-500 dark:text-graphite-400 mt-1">Real estate photo editing, automated.</p>
        </div>

        <div className="bg-white rounded-2xl border border-graphite-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-graphite-900 mb-4">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-graphite-700 mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourstudio.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-graphite-200 text-sm text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors"
                required
                disabled={show2FA}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-graphite-700">Password</label>
                <Link href="/forgot" className="text-xs text-cyan hover:underline">Forgot password?</Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-graphite-200 text-sm text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors"
                required
                disabled={show2FA}
              />
            </div>

            {show2FA && (
              <div>
                <label className="text-sm font-medium text-graphite-700 mb-1.5 block">
                  Authenticator code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-graphite-200 text-sm text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors font-mono tracking-widest"
                  autoFocus
                  required
                />
                <p className="text-xs text-graphite-400 mt-1">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-br from-graphite-900 to-graphite-700 text-white text-sm font-semibold shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              {isLoading
                ? show2FA
                  ? "Verifying..."
                  : "Signing in..."
                : show2FA
                ? "Verify & sign in"
                : "Sign in"}
            </button>

            {show2FA && (
              <button
                type="button"
                onClick={() => {
                  setShow2FA(false);
                  setTwoFactorCode("");
                  setError("");
                }}
                className="w-full text-xs text-graphite-400 hover:text-graphite-600 transition"
              >
                Back
              </button>
            )}
          </form>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
