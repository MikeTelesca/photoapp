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

  const inputClass =
    "w-full h-10 px-3 rounded-md border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-900 text-sm text-graphite-900 dark:text-white placeholder:text-graphite-400 dark:placeholder:text-graphite-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50";

  return (
    <div className="min-h-screen bg-graphite-50 dark:bg-graphite-950 flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-[-0.05em]">
            <span className="text-graphite-900 dark:text-white">Batch</span><span className="text-cyan">Base</span>
          </h1>
          <p className="text-sm text-graphite-500 dark:text-graphite-400 mt-1">
            Sign in to continue.
          </p>
        </div>

        <div className="bg-white dark:bg-graphite-900 rounded-lg border border-graphite-200 dark:border-graphite-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-graphite-600 dark:text-graphite-300 mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourstudio.com"
                className={inputClass}
                required
                disabled={show2FA}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-graphite-600 dark:text-graphite-300">
                  Password
                </label>
                <Link
                  href="/forgot"
                  className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
                required
                disabled={show2FA}
              />
            </div>

            {show2FA && (
              <div>
                <label className="text-xs font-medium text-graphite-600 dark:text-graphite-300 mb-1.5 block">
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
                  className={`${inputClass} font-mono tracking-widest text-center`}
                  autoFocus
                  required
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-md bg-graphite-900 dark:bg-white text-white dark:text-graphite-900 text-sm font-medium hover:bg-graphite-800 dark:hover:bg-graphite-100 transition-colors disabled:opacity-50"
            >
              {isLoading
                ? show2FA
                  ? "Verifying…"
                  : "Signing in…"
                : show2FA
                ? "Verify and sign in"
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
                className="w-full text-xs text-graphite-500 dark:text-graphite-400 hover:text-graphite-900 dark:hover:text-white transition-colors"
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
