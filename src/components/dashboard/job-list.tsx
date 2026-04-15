"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { JobCard } from "./job-card";
import { DemoJobButton } from "./demo-job-button";
import type { Job } from "@/lib/types";

const filters = ["All", "Processing", "Review", "Approved"] as const;

interface JobListProps {
  jobs: Job[];
}

export function JobList({ jobs }: JobListProps) {
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const filtered = activeFilter === "All"
    ? jobs.filter((j) => j.status !== "deleted")
    : jobs.filter((j) => j.status === activeFilter.toLowerCase());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Jobs</CardTitle>
        <div className="inline-flex bg-graphite-100 rounded-lg p-0.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3.5 py-1 rounded-md text-[11.5px] font-semibold transition-all duration-200 ${
                activeFilter === f
                  ? "bg-white text-graphite-900 shadow-sm"
                  : "text-graphite-400 hover:text-graphite-500"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </CardHeader>
      <div className="py-1">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-graphite-400">
              {activeFilter === "All"
                ? "No jobs yet. Click 'New Job' to create your first one, or try a demo to see how it works."
                : `No ${activeFilter.toLowerCase()} jobs.`}
            </p>
            {activeFilter === "All" && <DemoJobButton />}
          </div>
        ) : (
          filtered.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>
    </Card>
  );
}
