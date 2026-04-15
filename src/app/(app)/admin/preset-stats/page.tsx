"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

interface Stat {
  preset: string;
  jobCount: number;
  totalPhotos: number;
  approvedPhotos: number;
  totalCost: number;
  approvalRate: number;
}

export default function PresetStatsPage() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/preset-stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <Topbar title="Preset usage" subtitle="Usage metrics by preset" />
      <div className="p-6">
        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-3 dark:text-white">
              Preset usage statistics
            </h2>
            {loading ? (
              <div className="text-xs text-graphite-400">Loading...</div>
            ) : stats.length === 0 ? (
              <div className="text-xs text-graphite-400 text-center py-4">
                No data yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-graphite-400 border-b border-graphite-100 dark:border-graphite-800">
                    <tr>
                      <th className="text-left py-2 px-2">Preset</th>
                      <th className="text-right py-2 px-2">Jobs</th>
                      <th className="text-right py-2 px-2">Photos</th>
                      <th className="text-right py-2 px-2">Approved</th>
                      <th className="text-right py-2 px-2">Approval rate</th>
                      <th className="text-right py-2 px-2">Total cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s) => (
                      <tr
                        key={s.preset}
                        className="border-b border-graphite-50 dark:border-graphite-800 hover:bg-graphite-50 dark:hover:bg-graphite-800/50"
                      >
                        <td className="py-2 px-2 font-medium dark:text-white capitalize">
                          {s.preset}
                        </td>
                        <td className="text-right py-2 px-2">{s.jobCount}</td>
                        <td className="text-right py-2 px-2">{s.totalPhotos}</td>
                        <td className="text-right py-2 px-2">
                          {s.approvedPhotos}
                        </td>
                        <td className="text-right py-2 px-2">
                          <span
                            className={
                              s.approvalRate >= 80
                                ? "text-emerald-600 font-semibold"
                                : s.approvalRate >= 60
                                  ? "text-amber-600 font-semibold"
                                  : "text-red-600 font-semibold"
                            }
                          >
                            {s.approvalRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right py-2 px-2 font-semibold dark:text-white">
                          ${s.totalCost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
