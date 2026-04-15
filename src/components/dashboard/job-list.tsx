"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { JobFilterBar } from "./job-filter-bar";
import { DemoJobButton } from "./demo-job-button";
import type { Job } from "@/lib/types";

interface JobListProps {
  jobs: Job[];
}

export function JobList({ jobs }: JobListProps) {
  const activeJobs = jobs.filter((j) => j.status !== "deleted");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Jobs</CardTitle>
      </CardHeader>
      <div className="py-1">
        {activeJobs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-graphite-400">
              No jobs yet. Click 'New Job' to create your first one, or try a demo to see how it works.
            </p>
            <DemoJobButton />
          </div>
        ) : (
          <JobFilterBar jobs={activeJobs} />
        )}
      </div>
    </Card>
  );
}
