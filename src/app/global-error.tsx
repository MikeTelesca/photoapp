"use client";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-6 bg-graphite-50">
          <div className="text-center max-w-md">
            <div className="text-7xl font-bold text-red-500 mb-2">500</div>
            <h1 className="text-2xl font-bold text-graphite-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-graphite-500 mb-2">
              We hit an unexpected error. The team has been notified.
            </p>
            {error.digest && (
              <p className="text-[11px] text-graphite-400 mb-6 font-mono">
                Error ID: {error.digest}
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <button onClick={() => reset()}
                className="text-sm px-4 py-2 rounded bg-cyan text-white font-semibold hover:bg-cyan-600">
                Try again
              </button>
              <Link href="/dashboard"
                className="text-sm px-4 py-2 rounded border border-graphite-200 hover:bg-graphite-100">
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
