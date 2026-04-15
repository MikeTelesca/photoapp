"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

export default function HealthPage() {
  const [data, setData] = useState<any>(null);
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

  const checks = data?.checks || {};
  const stats = data?.stats || {};

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
              {stats.stuckPhotos > 0 && (
                <button
                  onClick={async () => {
                    await fetch("/api/cron/recover-stuck");
                    load();
                  }}
                  className="mt-3 text-xs px-3 py-1.5 rounded bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
                >
                  Run stuck recovery now
                </button>
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
