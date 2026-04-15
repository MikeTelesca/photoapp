"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

interface Report {
  id: string;
  category: string;
  message: string;
  metadata: string | null;
  resolved: boolean;
  createdAt: string;
  user?: { name?: string | null; email?: string | null } | null;
}

export default function FeedbackPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/feedback");
    const data = await res.json();
    setReports(data.reports || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(r: Report) {
    await fetch(`/api/admin/feedback/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !r.resolved }),
    });
    load();
  }

  const categoryEmoji: Record<string, string> = {
    bug: "🐛",
    feature: "💡",
    question: "❓",
    other: "💬",
  };

  return (
    <>
      <Topbar title="Feedback reports" />
      <div className="p-6">
        <Card>
          <div className="p-4">
            {loading ? (
              <div className="text-center text-xs text-graphite-400 py-4">
                Loading...
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center text-xs text-graphite-400 py-4">
                No feedback yet
              </div>
            ) : (
              <ul className="space-y-2">
                {reports.map((r) => {
                  let meta: any = {};
                  try {
                    meta = JSON.parse(r.metadata || "{}");
                  } catch {}
                  return (
                    <li
                      key={r.id}
                      className={`p-3 rounded border ${
                        r.resolved
                          ? "border-graphite-100 dark:border-graphite-800 opacity-60"
                          : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="text-sm font-semibold dark:text-white">
                            {categoryEmoji[r.category]} {r.category}
                          </span>
                          <span className="ml-2 text-xs text-graphite-500">
                            {r.user?.name || r.user?.email || "anonymous"}
                          </span>
                        </div>
                        <button
                          onClick={() => toggle(r)}
                          className="text-xs text-cyan hover:underline"
                        >
                          {r.resolved ? "Reopen" : "Mark resolved"}
                        </button>
                      </div>
                      <div className="text-sm whitespace-pre-wrap dark:text-graphite-200">
                        {r.message}
                      </div>
                      <div className="text-[10px] text-graphite-400 mt-2 font-mono">
                        {new Date(r.createdAt).toLocaleString()} ·{" "}
                        {meta.pageUrl}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
