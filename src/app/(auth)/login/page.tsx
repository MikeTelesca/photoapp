"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CameraIcon } from "@heroicons/react/24/outline";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
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
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-br from-graphite-900 to-graphite-700 text-white text-sm font-semibold shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-graphite-400 mt-4">
          Default: admin@photoapp.com / admin123
        </p>
      </div>
    </div>
  );
}
