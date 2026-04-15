"use client";

import { useEffect, useState } from "react";

type Day = { label: string; jobs: number; photos: number };

/** 7-day micro chart. Data fetched from the existing /api/dashboard/heatmap
 * endpoint (last 365 days) — we slice the last 7. Falls back to a quiet
 * skeleton if anything errors. */
export function WeeklyActivity() {
  const [days, setDays] = useState<Day[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/heatmap")
      .then((r) => r.json())
      .then((data: { date: string; photos: number; jobs: number }[]) => {
        if (cancelled || !Array.isArray(data)) return;
        const last7 = data.slice(-7).map((d) => {
          const dt = new Date(d.date);
          const label = dt.toLocaleDateString(undefined, { weekday: "short" });
          return { label, jobs: d.jobs, photos: d.photos };
        });
        setDays(last7);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const max = Math.max(1, ...(days ?? []).map((d) => d.photos));

  return (
    <div className="rounded-lg border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-graphite-900 dark:text-white">
            This week
          </h2>
          <p className="text-xs text-graphite-500 dark:text-graphite-400 mt-0.5">
            Photos processed
          </p>
        </div>
        <span className="text-2xl font-semibold tracking-tight text-graphite-900 dark:text-white tabular-nums">
          {(days ?? []).reduce((s, d) => s + d.photos, 0)}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-2 h-32 items-end">
        {(days ?? Array.from({ length: 7 }).map(() => ({ label: "", jobs: 0, photos: 0 }))).map(
          (d, i) => {
            const h = days ? Math.max(2, (d.photos / max) * 100) : 6;
            return (
              <div key={i} className="flex flex-col items-center gap-1 h-full justify-end">
                <div
                  className="w-full bg-cyan-500/80 dark:bg-cyan-500 rounded-sm transition-all duration-500"
                  style={{ height: `${h}%` }}
                  title={`${d.photos} photos`}
                />
                <div className="text-[10px] text-graphite-500 dark:text-graphite-400 mt-0.5">
                  {d.label}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
