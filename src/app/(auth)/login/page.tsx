"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

function LoginPageInner() {
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
        router.push("/jobs");
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
            <span className="text-graphite-900 dark:text-white">Batch</span>
            <span className="text-cyan">Base</span>
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
              />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite-600 dark:text-graphite-300 mb-1.5 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
                required
              />
            </div>

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
              {isLoading ? "Signing in…" : "Sign in"}
            </button>
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
