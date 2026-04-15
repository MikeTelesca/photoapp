"use client";
import { useEffect, useState } from "react";

interface Status {
  status: "ok" | "error" | "loading";
  email?: string;
  name?: string;
  error?: string;
}

export function DropboxStatus() {
  const [state, setState] = useState<Status>({ status: "loading" });
  const [showTooltip, setShowTooltip] = useState(false);

  async function check() {
    try {
      const res = await fetch("/api/status/dropbox");
      const data = await res.json();
      setState(data);
    } catch {
      setState({ status: "error", error: "Network" });
    }
  }

  useEffect(() => {
    check();
    const interval = setInterval(check, 60000); // every 60s
    return () => clearInterval(interval);
  }, []);

  const color = state.status === "ok" ? "bg-emerald-500" : state.status === "loading" ? "bg-amber-500 animate-pulse" : "bg-red-500";
  const label = state.status === "ok" ? "Connected" : state.status === "loading" ? "Checking..." : "Error";

  return (
    <div className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center gap-1.5 cursor-default">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-[10px] uppercase tracking-wide font-semibold text-graphite-500 dark:text-graphite-400">
          Dropbox
        </span>
      </div>
      {showTooltip && (
        <div className="absolute top-full right-0 mt-1 z-50 min-w-[160px] bg-white dark:bg-graphite-800 border border-graphite-200 dark:border-graphite-700 rounded shadow-lg p-2 text-xs">
          <div className="font-semibold dark:text-white">Dropbox: {label}</div>
          {state.email && <div className="text-graphite-500 dark:text-graphite-400 truncate">{state.email}</div>}
          {state.error && <div className="text-red-500 text-[10px] mt-1">{state.error}</div>}
          {state.status === "error" && (
            <a href="/settings" className="text-cyan text-[10px] mt-1 inline-block hover:underline">
              Fix in Settings →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
