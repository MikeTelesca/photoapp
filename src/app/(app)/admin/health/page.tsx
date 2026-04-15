"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

export default function HealthPage() {
  const [data, setData] = useState<any>(null);
  const [storage, setStorage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/health");
      if (res.status === 403 || res.status === 401) {
        setData({ error: "Admin access required" });
      } else {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/admin/storage").then(r => r.json()).then(setStorage).catch(() => {});
  }, []);

  const checks = data?.checks || {};
  const stats = data?.stats || {};

  async function runPurge() {
    if (!confirm("Run log purge now? This deletes old activity, error, and login records.")) return;
    const res = await fetch("/api/cron/purge-logs");
    const purgeData = await res.json();
    if (res.ok) {
      alert(
        `Purged: ${purgeData.activityDeleted} activity, ${purgeData.errorDeleted} errors, ${purgeData.loginDeleted} login records, ${purgeData.notificationDeleted} notifications`
      );
    } else {
      alert(`Purge failed: ${purgeData.error}`);
    }
  }

  return (
    <>
      <Topbar title="System Health" />
      <div className="p-6 space-y-4">
        {data?.error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
            {data.error}
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-xs text-graphite-400 dark:text-graphite-400">
            {data?.timestamp && `Last check: ${new Date(data.timestamp).toLocaleTimeString()}`}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 text-graphite-600 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {Object.keys(checks).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(checks).map(([key, val]: any) => (
              <Card key={key}>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${val.ok ? "bg-emerald-500" : "bg-red-500"}`} />
                    <div className="font-semibold capitalize text-graphite-900 dark:text-white">{key}</div>
                  </div>
                  <div className="text-xs text-graphite-500 dark:text-graphite-400 mt-1">
                    {val.ok ? val.account || "Operational" : val.error || val.hint || "Down"}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {Object.keys(stats).length > 0 && (
          <Card>
            <div className="p-4">
              <h2 className="text-sm font-semibold mb-3 dark:text-white">Job statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat label="Total jobs" value={stats.totalJobs} />
                <Stat label="Processing" value={stats.processing} />
                <Stat label="In review" value={stats.review} />
                <Stat label="Approved" value={stats.approved} />
                <Stat label="Total photos" value={stats.totalPhotos} />
                <Stat label="Pending photos" value={stats.pendingPhotos} />
                <Stat
                  label="Stuck (10+ min)"
                  value={stats.stuckPhotos}
                  danger={stats.stuckPhotos > 0}
                />
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                {stats.stuckPhotos > 0 && (
                  <button
                    onClick={async () => {
                      await fetch("/api/cron/recover-stuck");
                      load();
                    }}
                    className="text-xs px-3 py-1.5 rounded bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
                  >
                    Run stuck recovery now
                  </button>
                )}
                <button
                  onClick={runPurge}
                  className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800 transition-colors"
                >
                  🗑 Run log purge now
                </button>
              </div>
            </div>
          </Card>
        )}

        {storage && (
          <Card>
            <div className="p-4">
              <h2 className="text-sm font-semibold mb-3 dark:text-white">Storage usage</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                <Stat label="Total photos" value={storage.totals.photos} />
                <Stat label="Active jobs" value={storage.totals.activeJobs} />
                <Stat label="Archived jobs" value={storage.totals.archivedJobs} />
                <Stat label="Deleted jobs" value={storage.totals.deletedJobs} />
              </div>

              {storage.topUsers && storage.topUsers.length > 0 && (
                <>
                  <h3 className="text-xs font-semibold mb-2 text-graphite-500 dark:text-graphite-400 uppercase tracking-wide">Top users by photo count</h3>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-graphite-400 border-b border-graphite-100 dark:border-graphite-800">
                      <tr>
                        <th className="text-left py-2">User</th>
                        <th className="text-right">Jobs</th>
                        <th className="text-right">Photos</th>
                        <th className="text-right">Spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storage.topUsers.map((u: any) => (
                        <tr key={u.id} className="border-b border-graphite-50 dark:border-graphite-800">
                          <td className="py-2 dark:text-white">{u.name}</td>
                          <td className="text-right">{u.jobCount}</td>
                          <td className="text-right">{u.photoCount}</td>
                          <td className="text-right">${u.totalCost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </Card>
        )}

        {loading && !data && (
          <div className="text-sm text-graphite-400 dark:text-graphite-500">Loading health data...</div>
        )}
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: any;
  danger?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] text-graphite-400 dark:text-graphite-500">{label}</div>
      <div
        className={`text-xl font-bold ${
          danger ? "text-red-500" : "text-graphite-900 dark:text-white"
        }`}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}
