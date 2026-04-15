"use client";

import { JobFilterBar } from "./job-filter-bar";
import { DemoJobButton } from "./demo-job-button";
import type { Job } from "@/lib/types";

interface JobListProps {
  jobs: Job[];
}

export function JobList({ jobs }: JobListProps) {
  const activeJobs = jobs.filter((j) => j.status !== "deleted");

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-graphite-900 dark:text-white">
          Jobs
        </h2>
        <span className="text-xs text-graphite-500 dark:text-graphite-400 tabular-nums">
          {activeJobs.length} total
        </span>
      </div>

      {activeJobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-graphite-200 dark:border-graphite-800 bg-white/40 dark:bg-graphite-900/40 px-6 py-12 text-center">
          <p className="text-sm text-graphite-500 dark:text-graphite-400">
            No jobs yet. Click &apos;New Job&apos; to create your first one, or try a demo.
          </p>
          <DemoJobButton />
        </div>
      ) : (
        <div className="rounded-lg border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-900 overflow-hidden">
          <JobFilterBar jobs={activeJobs} />
        </div>
      )}
    </section>
  );
}
