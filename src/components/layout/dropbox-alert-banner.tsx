"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export function DropboxAlertBanner() {
  const [status, setStatus] = useState<"ok" | "error" | "loading">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/status/dropbox");
        const data = await res.json();
        if (!cancelled) {
          setStatus(data.status === "ok" ? "ok" : "error");
          if (data.error) setErrorMessage(data.error);
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    check();
    const timer = setInterval(check, 60000); // re-check every minute
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Reset dismiss when status comes back ok
  useEffect(() => {
    if (status === "ok") setDismissed(false);
  }, [status]);

  if (status !== "error" || dismissed) return null;

  return (
    <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 px-4 py-2 text-sm flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-red-600">⚠</span>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-red-800 dark:text-red-200">
            Dropbox connection error
          </span>
          <span className="text-red-700 dark:text-red-300 ml-2 text-xs hidden sm:inline">
            {errorMessage || "Token may have expired or revoked."}
          </span>
        </div>
      </div>
      <div className="flex gap-2 items-center flex-shrink-0">
        <Link
          href="/api/auth/dropbox"
          className="text-xs px-3 py-1 rounded bg-red-600 text-white font-semibold hover:bg-red-700"
        >
          Reconnect
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-red-600 dark:text-red-400 text-base leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
