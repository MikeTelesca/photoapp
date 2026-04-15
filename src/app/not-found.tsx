import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-graphite-50 dark:bg-graphite-900">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-cyan mb-2">404</div>
        <h1 className="text-2xl font-bold text-graphite-900 dark:text-white mb-2">
          Page not found
        </h1>
        <p className="text-sm text-graphite-500 dark:text-graphite-400 mb-6">
          We couldn't find the page you're looking for. It may have been moved or never existed.
        </p>
        <div className="flex gap-2 justify-center">
          <Link href="/dashboard"
            className="text-sm px-4 py-2 rounded bg-cyan text-white font-semibold hover:bg-cyan-600">
            Back to dashboard
          </Link>
          <Link href="/help"
            className="text-sm px-4 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-100 dark:hover:bg-graphite-800">
            Visit help
          </Link>
        </div>
      </div>
    </div>
  );
}
