"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Thin header that sits above the main content next to the SideNav.
 * Holds: global search, date pill, New Job CTA, notifications.
 * Page titles live in the page itself (inspo #2 "Welcome back, Mike" pattern).
 */
export function AppTopbar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [today, setToday] = useState<string>("");

  useEffect(() => {
    const d = new Date();
    setToday(
      d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    );
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-graphite-950/80 backdrop-blur border-b border-graphite-200 dark:border-graphite-800">
      <div className="px-6 h-14 flex items-center gap-4">
        {/* Search */}
        <form onSubmit={onSubmit} className="flex-1 max-w-xl relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-graphite-400 dark:text-graphite-500 pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search jobs, clients, photos…"
            className="w-full h-9 pl-10 pr-24 rounded-lg bg-graphite-100 dark:bg-graphite-900 border border-transparent hover:border-graphite-200 dark:hover:border-graphite-800 focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20 text-sm text-graphite-900 dark:text-white placeholder:text-graphite-400"
          />
          <span className="absolute inset-y-0 right-3 hidden sm:flex items-center text-[10px] text-graphite-400 dark:text-graphite-500 font-mono">
            <kbd className="px-1.5 py-0.5 rounded border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-950">⌘K</kbd>
          </span>
        </form>

        {/* Date pill */}
        <div className="hidden lg:inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-graphite-100 dark:bg-graphite-900 text-xs text-graphite-600 dark:text-graphite-300 whitespace-nowrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" />
          </svg>
          {today}
        </div>

        {/* New job */}
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-cyan text-white text-sm font-semibold hover:bg-cyan/90 transition-colors shadow-sm shadow-cyan/20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New job
        </Link>
      </div>
    </header>
  );
}
