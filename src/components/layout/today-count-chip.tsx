"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export function TodayCountChip() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/jobs/today-count");
        const data = await res.json();
        if (!cancelled) setCount(data.count || 0);
      } catch {}
    }
    load();
    const timer = setInterval(load, 5 * 60 * 1000); // every 5 min
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  if (count === null) return null;

  return (
    <Link href="/dashboard"
      className="hidden md:flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 text-graphite-500 dark:text-graphite-400 hover:bg-graphite-50 dark:hover:bg-graphite-800"
      title="Jobs created today">
      <span>📅 Today:</span>
      <span className="font-bold text-cyan">{count}</span>
    </Link>
  );
}
