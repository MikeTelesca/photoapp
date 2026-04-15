import Link from "next/link";
import { getMaintenanceState } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Down for maintenance",
};

export default async function MaintenancePage() {
  const { message } = await getMaintenanceState();

  return (
    <div className="min-h-screen flex items-center justify-center bg-graphite-50 dark:bg-graphite-950 p-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7 text-amber-600 dark:text-amber-400"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-graphite-900 dark:text-white mb-3">
          We&apos;ll be right back
        </h1>
        <p className="text-sm text-graphite-600 dark:text-graphite-300 mb-8 whitespace-pre-line">
          {message?.trim() ||
            "ATH AI Editor is undergoing scheduled maintenance. Please check back in a few minutes."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            prefetch={false}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition-colors"
          >
            Retry
          </Link>
        </div>
      </div>
    </div>
  );
}
