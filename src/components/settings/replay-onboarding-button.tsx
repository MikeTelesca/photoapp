"use client";

import { useState } from "react";

export function ReplayOnboardingButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleClick() {
    setStatus("loading");
    try {
      const res = await fetch("/api/user/onboarded", { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      setStatus("done");
      // Reload so the layout re-reads onboardedAt and the tour re-opens.
      setTimeout(() => window.location.reload(), 400);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-graphite-900 dark:text-white">
          Replay onboarding tour
        </div>
        <div className="text-xs text-graphite-500 dark:text-graphite-400">
          Step through the 4-screen product tour again.
        </div>
      </div>
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-graphite-100 dark:bg-graphite-800 text-graphite-900 dark:text-white hover:bg-graphite-200 dark:hover:bg-graphite-700 disabled:opacity-60"
      >
        {status === "loading"
          ? "Resetting…"
          : status === "done"
          ? "Reloading…"
          : status === "error"
          ? "Try again"
          : "Replay tour"}
      </button>
    </div>
  );
}
