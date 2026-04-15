"use client";

import { useEffect, useState } from "react";

interface PhotoStats {
  photosProcessedToday: number;
  photosProcessedWeek: number;
  photosProcessedMonth: number;
  jobsCompletedWeek: number;
  jobsCompletedMonth: number;
  topRoomTypes: { roomType: string; count: number }[];
}

const EMPTY: PhotoStats = {
  photosProcessedToday: 0,
  photosProcessedWeek: 0,
  photosProcessedMonth: 0,
  jobsCompletedWeek: 0,
  jobsCompletedMonth: 0,
  topRoomTypes: [],
};

export function PhotoStatsWidget() {
  const [stats, setStats] = useState<PhotoStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/dashboard/photo-stats", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PhotoStats;
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setStats(EMPTY);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const s = stats ?? EMPTY;
  const loading = stats === null && !error;

  return (
    <div className="bg-white dark:bg-graphite-900 rounded-lg border border-graphite-100 dark:border-graphite-800 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-graphite-900 dark:text-white">
          Photo throughput
        </h3>
        <span className="text-[10px] uppercase tracking-wide font-semibold text-cyan-600 dark:text-cyan-400">
          Processed
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Big
          label="Today"
          value={loading ? null : s.photosProcessedToday}
          accent="cyan"
        />
        <Big
          label="This week"
          value={loading ? null : s.photosProcessedWeek}
          accent="cyan"
          subtext={
            loading
              ? undefined
              : `${s.jobsCompletedWeek} job${s.jobsCompletedWeek === 1 ? "" : "s"} completed`
          }
        />
        <Big
          label="This month"
          value={loading ? null : s.photosProcessedMonth}
          accent="cyan"
          subtext={
            loading
              ? undefined
              : `${s.jobsCompletedMonth} job${s.jobsCompletedMonth === 1 ? "" : "s"} completed`
          }
        />
      </div>

      <div className="mt-4 pt-3 border-t border-graphite-100 dark:border-graphite-800">
        <div className="text-[10px] uppercase tracking-wide font-semibold text-graphite-500 dark:text-graphite-400 mb-2">
          Top room types (month)
        </div>
        {loading ? (
          <div className="text-xs text-graphite-400 dark:text-graphite-500">
            Loading…
          </div>
        ) : s.topRoomTypes.length === 0 ? (
          <div className="text-xs text-graphite-400 dark:text-graphite-500">
            No room tags yet this month.
          </div>
        ) : (
          <ul className="space-y-1">
            {s.topRoomTypes.map((r) => (
              <li
                key={r.roomType}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-graphite-700 dark:text-graphite-200 capitalize">
                  {r.roomType.replace(/-/g, " ")}
                </span>
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold tabular-nums">
                  {r.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <div className="mt-3 text-[11px] text-amber-600 dark:text-amber-400">
          Couldn&apos;t refresh stats ({error}).
        </div>
      )}
    </div>
  );
}

function Big({
  label,
  value,
  subtext,
  accent,
}: {
  label: string;
  value: number | null;
  subtext?: string;
  accent: "cyan";
}) {
  const accentClass =
    accent === "cyan" ? "text-cyan-600 dark:text-cyan-400" : "";
  return (
    <div className="bg-graphite-50 dark:bg-graphite-800/50 rounded-md px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide font-semibold text-graphite-500 dark:text-graphite-400">
        {label}
      </div>
      <div
        className={`text-2xl font-bold tabular-nums ${accentClass}`}
        aria-live="polite"
      >
        {value === null ? "—" : value.toLocaleString()}
      </div>
      {subtext ? (
        <div className="text-[10px] text-graphite-500 dark:text-graphite-400 mt-0.5 truncate">
          {subtext}
        </div>
      ) : null}
    </div>
  );
}
