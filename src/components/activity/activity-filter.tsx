"use client";
import { useState, useMemo } from "react";

interface ActivityLog {
  id: string;
  type: string;
  message: string;
  metadata?: string | null;
  createdAt: Date;
  userId?: string | null;
}

interface Props {
  logs: ActivityLog[];
}

export function ActivityFilter({ logs }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Build unique action types for filter dropdown
  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.type));
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        const hay = `${l.type} ${l.message} ${l.metadata || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (typeFilter && l.type !== typeFilter) return false;
      if (from) {
        const fromD = new Date(from);
        if (new Date(l.createdAt) < fromD) return false;
      }
      if (to) {
        const toD = new Date(to);
        toD.setHours(23, 59, 59, 999);
        if (new Date(l.createdAt) > toD) return false;
      }
      return true;
    });
  }, [logs, search, typeFilter, from, to]);

  function formatTime(date: Date | string): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: dateObj.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search type, message, metadata..."
          className="text-xs px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white md:col-span-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          <option value="">All types</option>
          {actionTypes.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="text-xs px-2 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="text-xs px-2 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>
      </div>

      <div className="text-xs text-graphite-400 dark:text-graphite-500 mb-3">
        Showing {filtered.length} of {logs.length}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-graphite-400 dark:text-graphite-500">
          No matching activity
        </div>
      ) : (
        <div className="space-y-0">
          {filtered.map((log, idx) => (
            <div
              key={log.id}
              className={`flex flex-col gap-1 py-3 px-4 text-xs rounded hover:bg-graphite-50 dark:hover:bg-graphite-800 transition-colors ${
                idx !== filtered.length - 1
                  ? "border-b border-graphite-100 dark:border-graphite-800"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-graphite-400 dark:text-graphite-500 font-mono">
                  {formatTime(log.createdAt)}
                </div>
                <div className="flex-1 font-semibold text-graphite-800 dark:text-graphite-100">
                  {log.type}
                </div>
                <div className="text-graphite-500 dark:text-graphite-400 text-[11px]">
                  {log.userId ? `User: ${log.userId.slice(0, 8)}` : "System"}
                </div>
              </div>
              {log.message && (
                <div className="text-graphite-600 dark:text-graphite-300 text-[11px]">
                  {log.message}
                </div>
              )}
              {log.metadata && (
                <div className="text-graphite-500 dark:text-graphite-400 font-mono text-[10px] bg-graphite-50 dark:bg-graphite-900 p-2 rounded border border-graphite-100 dark:border-graphite-800 overflow-x-auto">
                  {typeof log.metadata === "string"
                    ? log.metadata
                    : JSON.stringify(log.metadata, null, 2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
