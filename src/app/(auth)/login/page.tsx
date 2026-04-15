"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CameraIcon } from "@heroicons/react/24/outline";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-graphite-900 to-graphite-700 rounded-xl flex items-center justify-center shadow-lg mb-4">
            <CameraIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-graphite-900 tracking-tight">PhotoApp</h1>
          <p className="text-sm text-graphite-400 mt-1">AI-powered real estate photo editing</p>
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
                placeholder="admin@photoapp.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-graphite-200 text-sm text-graphite-900 placeholder:text-graphite-400 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors"
                required
                disabled={show2FA}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-graphite-700 mb-1.5 block">Password</label>
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

        <p className="text-center text-xs text-graphite-400 mt-4">
          Default: admin@photoapp.com / admin123
        </p>
      </div>
    </div>
  );
}
