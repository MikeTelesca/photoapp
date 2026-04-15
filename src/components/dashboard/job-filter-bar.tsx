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
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [bulkTag, setBulkTag] = useState("");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach(j => {
      if (j.tags) {
        j.tags.split(",").map(t => t.trim()).filter(Boolean).forEach(t => set.add(t));
      }
    });
    return Array.from(set).sort();
  }, [jobs]);

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      if (status !== "all" && j.status !== status) return false;
      if (preset !== "all" && j.preset !== preset) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${j.address} ${j.clientName || ""} ${j.photographerName || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (activeTag) {
        const jobTags = (j.tags || "").split(",").map(t => t.trim());
        if (!jobTags.includes(activeTag)) return false;
      }
      return true;
    });
  }, [jobs, search, status, preset, activeTag]);

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

  const addBulkTag = async () => {
    if (!bulkTag.trim() || selected.size === 0) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addTag", ids: Array.from(selected), tag: bulkTag }),
      });

      if (res.ok) {
        setBulkTag("");
        window.location.reload();
      } else {
        alert("Failed to add tag");
      }
    } catch (error) {
      console.error("Error adding tag:", error);
      alert("Error adding tag");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 px-5 py-2 bg-cyan-50 dark:bg-cyan-900/20 border-b border-cyan-200 dark:border-cyan-800 text-sm">
          <span className="font-semibold text-cyan-700 dark:text-cyan-300">{selected.size} selected</span>
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

          <div className="flex gap-1 items-center ml-2">
            <input
              type="text"
              value={bulkTag}
              onChange={(e) => setBulkTag(e.target.value)}
              placeholder="tag name"
              className="text-xs px-2 py-1 rounded border border-cyan-300 dark:border-cyan-700 dark:bg-graphite-800 dark:text-white w-24 focus:outline-none focus:border-cyan"
              onKeyDown={(e) => { if (e.key === "Enter") addBulkTag(); }}
              disabled={isLoading}
            />
            <button
              onClick={addBulkTag}
              disabled={!bulkTag.trim() || isLoading}
              className="px-2 py-1 rounded bg-cyan text-white text-xs font-semibold hover:bg-cyan-600 disabled:opacity-50"
            >
              + tag
            </button>
          </div>

          <button
            onClick={() => setSelected(new Set())}
            disabled={isLoading}
            className="ml-auto text-graphite-500 dark:text-graphite-400 text-xs hover:text-graphite-700 dark:hover:text-graphite-300"
          >
            Clear
          </button>
        </div>
      )}
      <div className="flex gap-2 px-5 py-3 border-b border-graphite-50 dark:border-graphite-800 bg-graphite-50/30 dark:bg-graphite-900/30">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search address, client, photographer..."
          className="flex-1 px-3 py-1.5 text-sm rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 text-graphite-900 dark:text-white placeholder:text-graphite-400 dark:placeholder:text-graphite-500 focus:outline-none focus:border-cyan"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-2 py-1.5 text-sm rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 text-graphite-900 dark:text-white">
          {statuses.map(s => <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>)}
        </select>
        <select value={preset} onChange={(e) => setPreset(e.target.value)}
          className="px-2 py-1.5 text-sm rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 text-graphite-900 dark:text-white">
          {presets.map(p => <option key={p} value={p}>{p === "all" ? "All presets" : p}</option>)}
        </select>
      </div>
      {allTags.length > 0 && (
        <div className="flex gap-1 flex-wrap px-5 py-2 border-b border-graphite-50 dark:border-graphite-800">
          <button
            onClick={() => setActiveTag(null)}
            className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wide font-semibold ${
              activeTag === null ? "bg-cyan text-white" : "bg-graphite-100 dark:bg-graphite-800 text-graphite-600 dark:text-graphite-300 hover:bg-graphite-200 dark:hover:bg-graphite-700"
            }`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wide font-semibold ${
                activeTag === tag ? "bg-cyan text-white" : "bg-cyan-50 text-cyan hover:bg-cyan-100"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-graphite-400 dark:text-graphite-500">
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
