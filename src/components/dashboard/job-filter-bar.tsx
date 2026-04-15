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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

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

  const toggle = (jobId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelected(newSelected);
  };

  const bulkApprove = async () => {
    if (selected.size === 0) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", ids: Array.from(selected) }),
      });

      if (res.ok) {
        setSelected(new Set());
        window.location.reload();
      } else {
        alert("Failed to approve jobs");
      }
    } catch (error) {
      console.error("Error approving jobs:", error);
      alert("Error approving jobs");
    } finally {
      setIsLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;

    if (!window.confirm(`Delete ${selected.size} job(s)? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: Array.from(selected) }),
      });

      if (res.ok) {
        setSelected(new Set());
        window.location.reload();
      } else {
        alert("Failed to delete jobs");
      }
    } catch (error) {
      console.error("Error deleting jobs:", error);
      alert("Error deleting jobs");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-2 px-5 py-2 bg-cyan-50 border-b border-cyan-200 text-sm">
          <span className="font-semibold text-cyan-700">{selected.size} selected</span>
          <button
            onClick={bulkApprove}
            disabled={isLoading}
            className="px-3 py-1 rounded bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={bulkDelete}
            disabled={isLoading}
            className="px-3 py-1 rounded bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={() => setSelected(new Set())}
            disabled={isLoading}
            className="ml-auto text-graphite-500 text-xs hover:text-graphite-700"
          >
            Clear
          </button>
        </div>
      )}
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
        filtered.map(job => (
          <div key={job.id} className="flex items-center">
            <input
              type="checkbox"
              checked={selected.has(job.id)}
              onChange={(e) => {
                e.stopPropagation();
                toggle(job.id);
              }}
              className="ml-3 mr-2 cursor-pointer"
            />
            <div className="flex-1">
              <JobCard job={job} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
