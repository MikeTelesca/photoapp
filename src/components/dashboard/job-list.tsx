"use client";

import { useEffect, useState } from "react";
import { JobFilterBar } from "./job-filter-bar";
import { JobKanban } from "./job-kanban";
import { DemoJobButton } from "./demo-job-button";
import type { Job } from "@/lib/types";

interface JobListProps {
  jobs: Job[];
}

type ViewMode = "list" | "board";

export function JobList({ jobs }: JobListProps) {
  const activeJobs = jobs.filter((j) => j.status !== "deleted");

  const [view, setView] = useState<ViewMode>("list");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("dashboard-view");
    if (saved === "list" || saved === "board") setView(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("dashboard-view", view);
  }, [view]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-semibold text-graphite-900 dark:text-white">
            Jobs
          </h2>
          <span className="text-xs text-graphite-500 dark:text-graphite-400 tabular-nums">
            {activeJobs.length} total
          </span>
        </div>

        {activeJobs.length > 0 && (
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-900 p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                view === "list"
                  ? "bg-graphite-100 dark:bg-graphite-800 text-graphite-900 dark:text-white"
                  : "text-graphite-500 dark:text-graphite-400 hover:text-graphite-900 dark:hover:text-white"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M1 3h10M1 6h10M1 9h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              List
            </button>
            <button
              type="button"
              onClick={() => setView("board")}
              aria-pressed={view === "board"}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                view === "board"
                  ? "bg-graphite-100 dark:bg-graphite-800 text-graphite-900 dark:text-white"
                  : "text-graphite-500 dark:text-graphite-400 hover:text-graphite-900 dark:hover:text-white"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <rect x="1" y="2" width="3" height="8" stroke="currentColor" strokeWidth="1.2" rx="0.5" />
                <rect x="5" y="2" width="3" height="5" stroke="currentColor" strokeWidth="1.2" rx="0.5" />
                <rect x="9" y="2" width="2" height="3" stroke="currentColor" strokeWidth="1.2" rx="0.5" />
              </svg>
              Board
            </button>
          </div>
        )}
      </div>

      {activeJobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-graphite-200 dark:border-graphite-800 bg-white/40 dark:bg-graphite-900/40 px-6 py-12 text-center">
          <p className="text-sm text-graphite-500 dark:text-graphite-400">
            No jobs yet. Click &apos;New Job&apos; to create your first one, or try a demo.
          </p>
          <DemoJobButton />
        </div>
      ) : view === "board" ? (
        <JobKanban jobs={activeJobs} />
      ) : (
        <div className="rounded-lg border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-900 overflow-hidden">
          <JobFilterBar jobs={activeJobs} />
        </div>
      )}
    </section>
  );
}
