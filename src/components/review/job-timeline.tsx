"use client";
import { useState, useEffect } from "react";

interface Event {
  at: string;
  type: string;
  title: string;
  detail?: string;
}

const TYPE_COLORS: Record<string, string> = {
  created: "bg-cyan-500",
  processing: "bg-amber-500",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
  share: "bg-purple-500",
  error: "bg-red-500",
  activity: "bg-graphite-400",
};

export function JobTimeline({ jobId }: { jobId: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!open && events.length === 0) {
      setLoading(true);
      try {
        const res = await fetch(`/api/jobs/${jobId}/timeline`);
        const data = await res.json();
        setEvents(data.events || []);
      } finally {
        setLoading(false);
      }
    }
    setOpen(!open);
  }

  return (
    <div className="border border-graphite-100 dark:border-graphite-800 rounded">
      <button
        onClick={toggle}
        className="w-full flex justify-between items-center px-3 py-2 text-xs font-semibold text-graphite-600 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800"
      >
        Timeline
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="px-3 py-2 border-t border-graphite-100 dark:border-graphite-800">
          {loading ? (
            <div className="text-xs text-graphite-400 py-2">Loading...</div>
          ) : events.length === 0 ? (
            <div className="text-xs text-graphite-400 py-2">No events yet</div>
          ) : (
            <ul className="space-y-2 relative">
              <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-graphite-100 dark:bg-graphite-700" />
              {events.map((e, i) => (
                <li key={i} className="flex gap-3 relative">
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${
                      TYPE_COLORS[e.type] || "bg-graphite-400"
                    } ring-2 ring-white dark:ring-graphite-900`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold dark:text-white truncate">
                      {e.title}
                    </div>
                    {e.detail && (
                      <div className="text-[11px] text-graphite-500 dark:text-graphite-400 truncate">
                        {e.detail}
                      </div>
                    )}
                    <div className="text-[10px] text-graphite-400">
                      {new Date(e.at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
