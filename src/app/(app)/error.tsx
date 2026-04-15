"use client";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-5xl font-bold text-amber-500 mb-2">⚠</div>
        <h1 className="text-xl font-bold text-graphite-900 dark:text-white mb-2">
          Something went wrong on this page
        </h1>
        <p className="text-sm text-graphite-500 dark:text-graphite-400 mb-2">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="text-[11px] text-graphite-400 mb-4 font-mono">Error: {error.digest}</p>
        )}
        <div className="flex gap-2 justify-center">
          <button onClick={() => reset()}
            className="text-sm px-4 py-2 rounded bg-cyan text-white font-semibold">
            Try again
          </button>
          <Link href="/dashboard"
            className="text-sm px-4 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
