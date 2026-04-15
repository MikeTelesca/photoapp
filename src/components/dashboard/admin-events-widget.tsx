"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface EventsData {
  signups: Array<{ id: string; email: string; name?: string | null; createdAt: string }>;
  jobsCreated: number;
  errorsLogged: number;
  pendingFeedback: number;
}

export function AdminEventsWidget() {
  const [data, setData] = useState<EventsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/events")
      .then(async r => {
        if (r.status === 401 || r.status === 403) {
          setAccessDenied(true);
          return;
        }
        const data = await r.json();
        setData(data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (accessDenied || (!loading && !data)) return null;

  return (
    <div className="bg-white dark:bg-graphite-900 rounded-lg border border-graphite-100 dark:border-graphite-800">
      <div className="px-4 py-3 border-b border-graphite-50 dark:border-graphite-800">
        <h3 className="text-sm font-semibold text-graphite-900 dark:text-white">
          🛡 Admin events <span className="text-xs text-graphite-400 ml-1">last 24h</span>
        </h3>
      </div>
      {loading ? (
        <div className="p-4 text-xs text-graphite-400">Loading...</div>
      ) : data ? (
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Stat label="Jobs" value={data.jobsCreated} />
            <Stat label="Errors" value={data.errorsLogged} danger={data.errorsLogged > 0} />
            <Stat label="Feedback" value={data.pendingFeedback} highlight={data.pendingFeedback > 0} />
          </div>
          {data.signups.length > 0 && (
            <div className="pt-2 border-t border-graphite-50 dark:border-graphite-800">
              <div className="text-[10px] uppercase tracking-wide text-graphite-500 dark:text-graphite-400 mb-1">New signups</div>
              <ul className="space-y-1">
                {data.signups.slice(0, 3).map(u => (
                  <li key={u.id} className="text-xs dark:text-graphite-300 truncate">
                    👋 {u.name || u.email}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="pt-2 border-t border-graphite-50 dark:border-graphite-800 flex gap-2 text-[10px]">
            <Link href="/admin/health" className="text-cyan hover:underline">Health</Link>
            <Link href="/admin/errors" className="text-cyan hover:underline">Errors</Link>
            <Link href="/admin/feedback" className="text-cyan hover:underline">Feedback</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, danger, highlight }: { label: string; value: number; danger?: boolean; highlight?: boolean; }) {
  return (
    <div>
      <div className={`text-2xl font-bold ${danger ? "text-red-500" : highlight ? "text-amber-500" : "text-graphite-900 dark:text-white"}`}>{value}</div>
      <div className="text-[10px] text-graphite-400 uppercase tracking-wide">{label}</div>
    </div>
  );
}
