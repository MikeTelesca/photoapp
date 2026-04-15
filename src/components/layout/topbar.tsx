"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { DropboxStatus } from "./dropbox-status";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [aiStatus, setAiStatus] = useState<{ processing: number; queue: number }>({ processing: 0, queue: 0 });

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/stats")
        .then(r => r.json())
        .then(data => {
          setAiStatus({
            processing: data.processingJobs || 0,
            queue: data.reviewJobs || 0,
          });
        })
        .catch(() => {});
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (q) {
      router.push(`/dashboard?search=${encodeURIComponent(q)}`);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="sticky top-0 z-10 bg-[rgba(240,242,245,0.85)] dark:bg-[rgba(10,10,10,0.85)] backdrop-blur-xl border-b border-graphite-200 dark:border-graphite-800 px-8 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-[22px] font-bold text-graphite-900 dark:text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-graphite-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2.5">
        {aiStatus.processing > 0 && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {aiStatus.processing} processing
          </div>
        )}
        <DropboxStatus />
        <NotificationBell />
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
          className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 text-graphite-500 dark:text-graphite-400 hidden md:flex items-center gap-1 hover:border-graphite-300 dark:hover:border-graphite-600 transition-colors"
        >
          <span>Search</span>
          <kbd className="text-[10px] font-mono px-1 py-0.5 bg-graphite-100 dark:bg-graphite-800 rounded">⌘K</kbd>
        </button>
        <form onSubmit={handleSearch}>
          <div className="flex items-center gap-2 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-[10px] px-3.5 py-2 w-[200px] text-[13px] hover:border-graphite-300 dark:hover:border-graphite-600 transition-colors focus-within:border-cyan focus-within:ring-1 focus-within:ring-cyan">
            <MagnifyingGlassIcon className="w-[15px] h-[15px] text-graphite-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="flex-1 bg-transparent text-graphite-900 dark:text-white placeholder:text-graphite-400 focus:outline-none min-w-0"
            />
          </div>
        </form>
        {actions}
        <a href="/api/jobs/export" download>
          <Button variant="outline">Export CSV</Button>
        </a>
        <Button variant="outline">Import</Button>
        <Link href="/jobs/new">
          <Button>
            <PlusIcon className="w-3.5 h-3.5" />
            New Job
          </Button>
        </Link>
      </div>
    </div>
  );
}
