"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Job } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface Props {
  jobs: Job[];
}

type ColumnKey = "pending" | "processing" | "review" | "approved";

const COLUMNS: { key: ColumnKey; label: string; accent: string; barColor: string }[] = [
  { key: "pending", label: "Pending", accent: "text-graphite-500 dark:text-graphite-400", barColor: "bg-graphite-400" },
  { key: "processing", label: "Processing", accent: "text-amber-600 dark:text-amber-400", barColor: "bg-amber-500" },
  { key: "review", label: "Needs review", accent: "text-cyan dark:text-cyan-light", barColor: "bg-cyan-500" },
  { key: "approved", label: "Done", accent: "text-emerald-600 dark:text-emerald-400", barColor: "bg-emerald-500" },
];

/**
 * Kanban board view — groups jobs into status columns matching the
 * project-management inspo (pending/processing/review/done).
 * Each card = clickable link to /review/[jobId], progress bar tinted
 * by status, meta row with client/photographer/cost.
 */
export function JobKanban({ jobs }: Props) {
  const grouped = useMemo(() => {
    const map: Record<ColumnKey, Job[]> = {
      pending: [],
      processing: [],
      review: [],
      approved: [],
    };
    for (const j of jobs) {
      if (j.status in map) {
        map[j.status as ColumnKey].push(j);
      }
    }
    // sort within each column: pinned first, then priority, then newest
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    for (const k of Object.keys(map) as ColumnKey[]) {
      map[k].sort((a, b) => {
        const aPin = a.pinnedAt ? 1 : 0;
        const bPin = b.pinnedAt ? 1 : 0;
        if (aPin !== bPin) return bPin - aPin;
        const ap = priorityOrder[a.priority || "medium"] ?? 1;
        const bp = priorityOrder[b.priority || "medium"] ?? 1;
        if (ap !== bp) return ap - bp;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return map;
  }, [jobs]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {COLUMNS.map((col) => {
        const list = grouped[col.key];
        return (
          <div
            key={col.key}
            className="rounded-xl border border-graphite-200 dark:border-graphite-800 bg-graphite-50/50 dark:bg-graphite-900/50 p-3 min-h-[200px] flex flex-col"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className={`text-[10px] font-bold uppercase tracking-[0.18em] ${col.accent}`}>
                {col.label} <span className="text-graphite-400 dark:text-graphite-500 font-normal">({list.length})</span>
              </h3>
              <Link
                href="/jobs/new"
                className="text-graphite-400 hover:text-cyan text-xs"
                title="Add new job"
                aria-label="Add new job"
              >
                +
              </Link>
            </div>

            <div className="space-y-2 flex-1">
              {list.length === 0 ? (
                <div className="rounded-lg border border-dashed border-graphite-200 dark:border-graphite-800 bg-white/40 dark:bg-graphite-800/20 px-3 py-6 text-center">
                  <p className="text-[11px] text-graphite-400 dark:text-graphite-500">
                    Drag your job here…
                  </p>
                </div>
              ) : (
                list.map((job) => (
                  <KanbanCard key={job.id} job={job} barColor={col.barColor} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ job, barColor }: { job: Job; barColor: string }) {
  const progress =
    job.totalPhotos > 0
      ? Math.round((job.processedPhotos / job.totalPhotos) * 100)
      : 0;
  const isLinkable =
    job.status === "review" ||
    job.status === "approved" ||
    job.status === "processing";
  const href = isLinkable ? `/review/${job.id}` : `/jobs/${job.id}`;

  return (
    <Link
      href={href}
      className="block rounded-lg border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-800/50 hover:bg-graphite-50 dark:hover:bg-graphite-800 transition-colors p-3 group"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-graphite-900 dark:text-white truncate">
            {job.address}
          </div>
          {job.clientName && (
            <div className="text-[11px] text-graphite-500 dark:text-graphite-400 truncate mt-0.5">
              {job.clientName}
            </div>
          )}
        </div>
        {job.priority === "high" && (
          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 font-medium uppercase tracking-wide">
            High
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Badge variant={job.preset === "luxury" ? "luxury" : "standard"}>
          {job.preset.charAt(0).toUpperCase() + job.preset.slice(1)}
        </Badge>
        <span className="text-[10px] tabular-nums text-graphite-500 dark:text-graphite-400 ml-auto">
          {job.processedPhotos}/{job.totalPhotos}
        </span>
      </div>

      <div className="mt-2 h-1 w-full bg-graphite-200/70 dark:bg-graphite-700/70 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-graphite-500 dark:text-graphite-400">
        <span className="truncate">{job.photographerName}</span>
        {job.cost > 0 && (
          <span className="tabular-nums shrink-0">${job.cost.toFixed(2)}</span>
        )}
      </div>
    </Link>
  );
}
