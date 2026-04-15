"use client";
import { useEffect, useState } from "react";

interface Check { status: "ok" | "down"; }
interface Status {
  status: "operational" | "degraded";
  checks: Record<string, Check>;
  timestamp: string;
}

const LABELS: Record<string, string> = {
  database: "Database",
  dropbox: "Dropbox storage",
  ai: "AI image generation",
  email: "Email delivery",
};

export default function StatusPage() {
  const [data, setData] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/public/status");
      const d = await res.json();
      setData(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-graphite-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-graphite-900">ATH Editor Status</h1>
          <p className="text-sm text-graphite-500 mt-2">Real-time service health</p>
        </div>

        {data && (
          <div className={`mb-6 p-4 rounded-lg ${
            data.status === "operational"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-amber-50 border border-amber-200 text-amber-800"
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${data.status === "operational" ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="font-semibold">
                {data.status === "operational" ? "All systems operational" : "Some services degraded"}
              </span>
            </div>
          </div>
        )}

        {loading && !data ? (
          <div className="text-center text-sm text-graphite-400">Checking...</div>
        ) : data ? (
          <div className="bg-white rounded-lg shadow-sm border border-graphite-100">
            <ul className="divide-y divide-graphite-100">
              {Object.entries(data.checks).map(([key, val]) => (
                <li key={key} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-graphite-800">{LABELS[key] || key}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${val.status === "ok" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className={`text-xs font-semibold uppercase ${val.status === "ok" ? "text-emerald-700" : "text-red-700"}`}>
                      {val.status === "ok" ? "Operational" : "Down"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-4 py-2 bg-graphite-50 text-[10px] text-graphite-500 border-t border-graphite-100">
              Last checked {new Date(data.timestamp).toLocaleString()} · Auto-refreshes every 60s
            </div>
          </div>
        ) : null}

        <div className="text-center mt-8">
          <a href="/dashboard" className="text-sm text-cyan hover:underline">Back to app →</a>
        </div>
      </div>
    </div>
  );
}
