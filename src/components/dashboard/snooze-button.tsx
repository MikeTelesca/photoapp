"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SnoozeButton({
  jobId,
  snoozedUntil,
}: {
  jobId: string;
  snoozedUntil?: Date | string | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function snooze(days: number | "tomorrow" | "next-week" | "clear") {
    let until: Date | null = null;
    const now = new Date();
    if (days === "clear") {
      until = null;
    } else if (days === "tomorrow") {
      until = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
    } else if (days === "next-week") {
      until = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 9, 0, 0);
    } else if (typeof days === "number") {
      until = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 9, 0, 0);
    }

    await fetch(`/api/jobs/${jobId}/snooze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ until: until?.toISOString() || null }),
    });
    setOpen(false);
    router.refresh();
  }

  if (snoozedUntil && new Date(snoozedUntil) > new Date()) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          snooze("clear");
        }}
        className="text-xs px-2 py-1 rounded bg-graphite-100 dark:bg-graphite-800 text-graphite-500"
        title={`Snoozed until ${new Date(snoozedUntil).toLocaleDateString()}. Click to wake.`}
      >
        💤 Snoozed
      </button>
    );
  }

  return (
    <div
      className="relative inline-block"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800"
        title="Snooze"
      >
        💤 Snooze
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-40 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded shadow-lg">
          <button
            onClick={() => snooze("tomorrow")}
            className="block w-full text-left text-xs px-3 py-2 hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:text-white"
          >
            Tomorrow
          </button>
          <button
            onClick={() => snooze(3)}
            className="block w-full text-left text-xs px-3 py-2 hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:text-white"
          >
            In 3 days
          </button>
          <button
            onClick={() => snooze("next-week")}
            className="block w-full text-left text-xs px-3 py-2 hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:text-white"
          >
            Next week
          </button>
          <button
            onClick={() => snooze(30)}
            className="block w-full text-left text-xs px-3 py-2 hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:text-white"
          >
            In a month
          </button>
        </div>
      )}
    </div>
  );
}
