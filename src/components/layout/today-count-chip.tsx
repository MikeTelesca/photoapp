"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface Summary {
  jobsCreated: number;
  photosProcessed: number;
  awaitingReview: number;
  spend: number;
  recentJobs: Array<{ id: string; address: string }>;
}

export function TodayCountChip() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/jobs/today-summary");
        const data = await res.json();
        if (!cancelled) setSummary(data);
      } catch {}
    }
    load();
    const timer = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  if (!summary) return null;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="hidden md:flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 text-graphite-500 dark:text-graphite-400 hover:bg-graphite-50 dark:hover:bg-graphite-800"
        title="Today's stats">
        <span>📅 Today:</span>
        <span className="font-bold text-cyan">{summary.jobsCreated}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-lg shadow-xl p-3">
          <h3 className="text-sm font-semibold mb-2 dark:text-white">Today's stats</h3>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Stat label="Jobs" value={summary.jobsCreated} />
            <Stat label="Photos" value={summary.photosProcessed} />
            <Stat label="Awaiting" value={summary.awaitingReview} highlight={summary.awaitingReview > 0} />
            <Stat label="Spend" value={`$${summary.spend.toFixed(2)}`} />
          </div>
          {summary.recentJobs.length > 0 && (
            <div className="pt-2 border-t border-graphite-100 dark:border-graphite-800">
              <div className="text-[10px] uppercase tracking-wide text-graphite-500 dark:text-graphite-400 mb-1">Recent</div>
              <ul>
                {summary.recentJobs.map(j => (
                  <li key={j.id}>
                    <Link href={`/review/${j.id}`} onClick={() => setOpen(false)}
                      className="block text-xs py-1 hover:text-cyan dark:text-graphite-300 truncate">
                      {j.address}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link href="/dashboard" onClick={() => setOpen(false)}
            className="block mt-2 pt-2 border-t border-graphite-100 dark:border-graphite-800 text-xs text-cyan hover:underline">
            View dashboard →
          </Link>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean; }) {
  return (
    <div>
      <div className={`text-lg font-bold ${highlight ? "text-amber-500" : "text-graphite-900 dark:text-white"}`}>{value}</div>
      <div className="text-[10px] text-graphite-400 uppercase tracking-wide">{label}</div>
    </div>
  );
}
