"use client";
import { useState, useMemo } from "react";
import type { Job } from "@/lib/types";
import { JobCard } from "./job-card";

interface Props {
  jobs: Job[];
}

export function JobFilterBar({ jobs }: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [preset, setPreset] = useState<string>("all");

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      if (status !== "all" && j.status !== status) return false;
      if (preset !== "all" && j.preset !== preset) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${j.address} ${j.clientName || ""} ${j.photographerName || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, search, status, preset]);

  const statuses = ["all", "pending", "processing", "review", "approved", "rejected"];
  const presets = ["all", ...Array.from(new Set(jobs.map(j => j.preset)))];

  return (
    <div>
      <div className="flex gap-2 px-5 py-3 border-b border-graphite-50 bg-graphite-50/30">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search address, client, photographer..."
          className="flex-1 px-3 py-1.5 text-sm rounded border border-graphite-200 bg-white focus:outline-none focus:border-cyan"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-2 py-1.5 text-sm rounded border border-graphite-200 bg-white">
          {statuses.map(s => <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>)}
        </select>
        <select value={preset} onChange={(e) => setPreset(e.target.value)}
          className="px-2 py-1.5 text-sm rounded border border-graphite-200 bg-white">
          {presets.map(p => <option key={p} value={p}>{p === "all" ? "All presets" : p}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-graphite-400">
          No jobs match your filters
        </div>
      ) : (
        filtered.map(job => <JobCard key={job.id} job={job} />)
      )}
    </div>
  );
}
