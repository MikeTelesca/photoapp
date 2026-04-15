"use client";
import { useState, useEffect, useCallback } from "react";

interface TimelineEvent {
  type: string;
  at: string;
  label: string;
  sublabel?: string;
  icon?: string;
}

const TYPE_COLORS: Record<string, string> = {
  created: "bg-cyan-500",
  status: "bg-amber-500",
  processing: "bg-amber-500",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
  share: "bg-purple-500",
  comment: "bg-blue-500",
  download: "bg-indigo-500",
  activity: "bg-graphite-400",
  error: "bg-red-500",
};

const TYPE_ICONS: Record<string, string> = {
  created: "✨",
  status: "🔄",
  processing: "⚙️",
  approved: "✅",
  rejected: "❌",
  share: "🔗",
  comment: "💬",
  download: "⬇️",
  activity: "📋",
  error: "⚠️",
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}

interface JobTimelineProps {
  jobId: string;
  /** When true, render only a button that opens a drawer. Default true. */
  asDrawer?: boolean;
}

export function JobTimeline({ jobId, asDrawer = true }: JobTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/timeline`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (open && events.length === 0 && !loading) {
      load();
    }
  }, [open, events.length, loading, load]);

  const list = (
    <div className="relative">
      {loading ? (
        <div className="text-xs text-graphite-400 py-4 text-center">Loading timeline…</div>
      ) : error ? (
        <div className="text-xs text-red-500 py-4 text-center">{error}</div>
      ) : events.length === 0 ? (
        <div className="text-xs text-graphite-400 py-4 text-center">No activity yet</div>
      ) : (
        <ul className="space-y-3 relative pl-1">
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-graphite-100 dark:bg-graphite-700" />
          {events.map((e, i) => (
            <li key={i} className="flex gap-3 relative">
              <div
                className={`w-6 h-6 rounded-full flex-shrink-0 mt-0.5 ${
                  TYPE_COLORS[e.type] || "bg-graphite-400"
                } ring-2 ring-white dark:ring-graphite-900 flex items-center justify-center text-[11px]`}
                aria-hidden
              >
                <span>{TYPE_ICONS[e.type] || "•"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold dark:text-white">
                  {e.label}
                </div>
                {e.sublabel && (
                  <div className="text-[11px] text-graphite-500 dark:text-graphite-400 break-words">
                    {e.sublabel}
                  </div>
                )}
                <div
                  className="text-[10px] text-graphite-400"
                  title={new Date(e.at).toLocaleString()}
                >
                  {relativeTime(e.at)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (!asDrawer) {
    return <div className="p-3">{list}</div>;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-1.5 rounded-md bg-graphite-50 dark:bg-graphite-800 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-100 dark:hover:bg-graphite-700 font-medium"
        title="View job activity timeline"
        type="button"
      >
        🕒 Timeline
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Job activity timeline"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-graphite-900 shadow-xl flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-graphite-100 dark:border-graphite-800">
              <div className="flex items-center gap-2">
                <span className="text-base">🕒</span>
                <h2 className="text-sm font-semibold dark:text-white">
                  Activity Timeline
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={load}
                  className="text-xs px-2 py-1 rounded hover:bg-graphite-100 dark:hover:bg-graphite-800 text-graphite-600 dark:text-graphite-300"
                  title="Refresh"
                  type="button"
                >
                  ↻
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-xs px-2 py-1 rounded hover:bg-graphite-100 dark:hover:bg-graphite-800 text-graphite-600 dark:text-graphite-300"
                  aria-label="Close"
                  type="button"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">{list}</div>
          </div>
        </div>
      )}
    </>
  );
}
