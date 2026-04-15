"use client";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Job } from "@/lib/types";
import { tagColor } from "@/lib/tag-color";
import { loadFilters, saveFilter, deleteFilter, type SavedFilter } from "@/lib/dashboard-filters";
import { JobCard } from "./job-card";

interface Props {
  jobs: Job[];
}

// Helper to bucket jobs by date
function getDateBucket(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (d >= startOfToday) return "Today";
  if (d >= startOfYesterday) return "Yesterday";
  if (d >= startOfWeek) return "This week";
  if (d >= startOfMonth) return "This month";
  return "Older";
}

const BUCKET_ORDER = ["Pinned", "Today", "Yesterday", "This week", "This month", "Older"];

type Density = "compact" | "normal" | "comfortable";

export function JobFilterBar({ jobs }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [preset, setPreset] = useState<string>("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [bulkTag, setBulkTag] = useState("");
  const [bulkPriority, setBulkPriority] = useState("medium");
  const [bulkPreset, setBulkPreset] = useState("standard");
  const [groupByDate, setGroupByDate] = useState(true);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [density, setDensity] = useState<Density>("normal");
  const [showAssignClientModal, setShowAssignClientModal] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string; email?: string | null }>>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null | "__clear__">(null);

  // On mount, hydrate filter state from URL params
  useEffect(() => {
    const q = searchParams.get("q");
    const st = searchParams.get("status");
    const pr = searchParams.get("preset");
    const tg = searchParams.get("tag");

    if (q) setSearch(q);
    if (st) setStatus(st);
    if (pr) setPreset(pr);
    if (tg) setActiveTag(tg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load groupByDate preference from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("dashboard-group-by-date");
    if (saved === "false") setGroupByDate(false);
  }, []);

  // Load density preference from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("dashboard-density");
    if (saved === "compact" || saved === "normal" || saved === "comfortable") {
      setDensity(saved);
    }
  }, []);

  // Listen for density changes triggered from global shortcuts ([ and ])
  useEffect(() => {
    if (typeof window === "undefined") return;
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail === "compact" || detail === "normal" || detail === "comfortable") {
        setDensity(detail);
      }
    }
    window.addEventListener("ath-density-change", handler);
    return () => window.removeEventListener("ath-density-change", handler);
  }, []);

  // Load saved filters from localStorage
  useEffect(() => {
    setSavedFilters(loadFilters());
  }, []);

  // On filter state change, update URL (debounced)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (status && status !== "all") params.set("status", status);
      if (preset && preset !== "all") params.set("preset", preset);
      if (activeTag) params.set("tag", activeTag);

      const queryString = params.toString();
      const newUrl = queryString ? `?${queryString}` : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, status, preset, activeTag]);

  // Save groupByDate preference to localStorage
  useEffect(() => {
    localStorage.setItem("dashboard-group-by-date", String(groupByDate));
  }, [groupByDate]);

  // Save density preference to localStorage
  useEffect(() => {
    localStorage.setItem("dashboard-density", density);
  }, [density]);

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

  // Group filtered jobs by date
  const grouped = useMemo(() => {
    if (!groupByDate) return null;

    const groups = new Map<string, typeof filtered>();
    for (const j of filtered) {
      let bucket = getDateBucket(j.createdAt);
      // Pinned jobs go to top regardless
      if (j.pinnedAt) bucket = "Pinned";
      if (!groups.has(bucket)) groups.set(bucket, []);
      groups.get(bucket)!.push(j);
    }
    return BUCKET_ORDER.filter(b => groups.has(b)).map(b => ({ name: b, jobs: groups.get(b)! }));
  }, [filtered, groupByDate]);

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

  const bulkArchive = async () => {
    if (selected.size === 0) return;

    if (!window.confirm(`Archive ${selected.size} selected jobs? They'll be hidden from the dashboard but stay searchable.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", ids: Array.from(selected) }),
      });

      if (res.ok) {
        setSelected(new Set());
        window.location.reload();
      } else {
        alert("Failed to archive jobs");
      }
    } catch (error) {
      console.error("Error archiving jobs:", error);
      alert("Error archiving jobs");
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

  const bulkSetPriority = async () => {
    if (!confirm(`Set ${selected.size} jobs to ${bulkPriority} priority?`)) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setPriority", ids: Array.from(selected), priority: bulkPriority }),
      });

      if (res.ok) {
        setSelected(new Set());
        window.location.reload();
      } else {
        alert("Failed to set priority");
      }
    } catch (error) {
      console.error("Error setting priority:", error);
      alert("Error setting priority");
    } finally {
      setIsLoading(false);
    }
  };

  const bulkSetPreset = async () => {
    if (!confirm(`Set ${selected.size} pending jobs to ${bulkPreset} preset?`)) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setPreset", ids: Array.from(selected), preset: bulkPreset }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Updated ${data.count} jobs`);
        setSelected(new Set());
        window.location.reload();
      } else {
        alert("Failed to set preset");
      }
    } catch (error) {
      console.error("Error setting preset:", error);
      alert("Error setting preset");
    } finally {
      setIsLoading(false);
    }
  };

  const openAssignClient = async () => {
    if (selected.size === 0) return;
    setShowAssignClientModal(true);
    setClientSearch("");
    setSelectedClientId(null);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(Array.isArray(data) ? data : data.clients || []);
      }
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const bulkAssignClient = async () => {
    if (selected.size === 0 || selectedClientId === null) return;

    const clientId = selectedClientId === "__clear__" ? null : selectedClientId;

    setIsLoading(true);
    try {
      const res = await fetch("/api/jobs/bulk-assign-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: Array.from(selected), clientId }),
      });

      if (res.ok) {
        const data = await res.json();
        const msg = clientId
          ? `Assigned ${data.count} job(s) to ${data.clientName}`
          : `Cleared client from ${data.count} job(s)`;
        // Lightweight toast — fall back to alert if none available
        if (typeof window !== "undefined") {
          const evt = new CustomEvent("ath-toast", { detail: { message: msg, type: "success" } });
          window.dispatchEvent(evt);
        }
        alert(msg);
        setShowAssignClientModal(false);
        setSelected(new Set());
        window.location.reload();
      } else {
        alert("Failed to assign client");
      }
    } catch (error) {
      console.error("Error assigning client:", error);
      alert("Error assigning client");
    } finally {
      setIsLoading(false);
    }
  };

  function applyFilter(f: SavedFilter) {
    setSearch(f.search || "");
    setStatus(f.status || "all");
    setPreset(f.preset || "all");
    setActiveTag(f.tag || null);
  }

  function saveCurrent() {
    if (!filterName.trim()) return;
    // Only save if there's at least one filter active
    if (!search && status === "all" && preset === "all" && !activeTag) {
      alert("No filters active to save");
      return;
    }
    const created = saveFilter({
      name: filterName.trim(),
      search,
      status: status === "all" ? undefined : status,
      preset: preset === "all" ? undefined : preset,
      tag: activeTag || undefined,
    });
    setSavedFilters([created, ...savedFilters]);
    setFilterName("");
    setShowSavePrompt(false);
  }

  function removeFilter(id: string) {
    if (!confirm("Delete this saved filter?")) return;
    deleteFilter(id);
    setSavedFilters(loadFilters());
  }

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
            onClick={bulkArchive}
            disabled={isLoading}
            className="px-3 py-1 rounded bg-graphite-600 text-white text-xs font-semibold hover:bg-graphite-700 disabled:opacity-50"
          >
            📦 Archive
          </button>
          <button
            onClick={bulkDelete}
            disabled={isLoading}
            className="px-3 py-1 rounded bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={openAssignClient}
            disabled={isLoading}
            className="px-3 py-1 rounded bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 disabled:opacity-50"
          >
            👤 Assign Client
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

          <div className="flex gap-1 items-center">
            <select value={bulkPriority} onChange={(e) => setBulkPriority(e.target.value)}
              disabled={isLoading}
              className="text-xs px-1 py-1 rounded border border-cyan-300 dark:border-cyan-700 dark:bg-graphite-800 dark:text-white">
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
            <button onClick={bulkSetPriority}
              disabled={isLoading}
              className="text-xs px-2 py-1 rounded bg-graphite-600 text-white font-semibold hover:bg-graphite-700 disabled:opacity-50">
              Set Priority
            </button>
          </div>

          <div className="flex gap-1 items-center">
            <select value={bulkPreset} onChange={(e) => setBulkPreset(e.target.value)}
              disabled={isLoading}
              className="text-xs px-1 py-1 rounded border border-cyan-300 dark:border-cyan-700 dark:bg-graphite-800 dark:text-white">
              <option value="mls-standard">MLS Std</option>
              <option value="standard">Standard</option>
              <option value="bright">Bright</option>
              <option value="luxury">Luxury</option>
              <option value="flambient">Flambient</option>
            </select>
            <button onClick={bulkSetPreset}
              disabled={isLoading}
              className="text-xs px-2 py-1 rounded bg-graphite-600 text-white font-semibold hover:bg-graphite-700 disabled:opacity-50">
              Apply preset
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
      <div className="flex gap-2 px-5 py-3 border-b border-graphite-50 dark:border-graphite-800 bg-graphite-50/30 dark:bg-graphite-900/30 items-center">
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
        <button onClick={() => setGroupByDate(!groupByDate)}
          className="text-xs px-2 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 text-graphite-900 dark:text-graphite-300 hover:bg-graphite-100 dark:hover:bg-graphite-700">
          {groupByDate ? "📅 Grouped" : "📋 Flat"}
        </button>
        <a
          href={(() => {
            const params = new URLSearchParams();
            if (status && status !== "all") params.set("status", status);
            if (activeTag) params.set("tag", activeTag);
            const qs = params.toString();
            return qs ? `/api/jobs/export-csv?${qs}` : `/api/jobs/export-csv`;
          })()}
          className="text-xs px-2 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 text-graphite-900 dark:text-graphite-300 hover:bg-graphite-100 dark:hover:bg-graphite-700"
          title="Export filtered jobs as CSV"
        >
          ⬇ Export CSV
        </a>
        <div className="flex gap-0.5 ml-auto">
          {(["compact", "normal", "comfortable"] as Density[]).map(d => (
            <button key={d} onClick={() => setDensity(d)}
              className={`text-[10px] px-2 py-1 rounded ${density === d ? "bg-cyan text-white" : "border border-graphite-200 dark:border-graphite-700 text-graphite-500 dark:text-graphite-400"}`}
              title={`${d} layout`}>
              {d === "compact" ? "≡" : d === "normal" ? "☰" : "▤"}
            </button>
          ))}
        </div>
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
          {allTags.map(tag => {
            const c = tagColor(tag);
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wide font-semibold ${
                  activeTag === tag
                    ? "bg-cyan text-white"
                    : `${c.bg} ${c.text} hover:opacity-80`
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
      {(savedFilters.length > 0 || (search || status !== "all" || preset !== "all" || activeTag)) && (
        <div className="flex flex-wrap gap-1 px-5 py-2 border-b border-graphite-50 dark:border-graphite-800 items-center">
          <span className="text-[10px] uppercase tracking-wide font-semibold text-graphite-500">Saved:</span>
          {savedFilters.map(f => (
            <span key={f.id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-900/20 text-cyan">
              <button onClick={() => applyFilter(f)} className="hover:underline">{f.name}</button>
              <button onClick={() => removeFilter(f.id)} className="text-graphite-400 hover:text-red-500">×</button>
            </span>
          ))}
          {(search || status !== "all" || preset !== "all" || activeTag) && !showSavePrompt && savedFilters.length < 10 && (
            <button onClick={() => setShowSavePrompt(true)}
              className="text-[10px] px-2 py-0.5 rounded border border-graphite-200 dark:border-graphite-700 text-graphite-500 hover:bg-graphite-50 dark:hover:bg-graphite-800">
              + Save current
            </button>
          )}
          {showSavePrompt && (
            <span className="inline-flex items-center gap-1">
              <input autoFocus value={filterName} onChange={(e) => setFilterName(e.target.value)}
                placeholder="Filter name"
                onKeyDown={(e) => { if (e.key === "Enter") saveCurrent(); if (e.key === "Escape") setShowSavePrompt(false); }}
                className="text-[10px] px-2 py-0.5 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white w-32 focus:outline-none focus:border-cyan" />
              <button onClick={saveCurrent} className="text-[10px] text-cyan font-semibold hover:text-cyan-600">Save</button>
              <button onClick={() => setShowSavePrompt(false)} className="text-[10px] text-graphite-400 hover:text-graphite-500">×</button>
            </span>
          )}
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-graphite-400 dark:text-graphite-500">
          No jobs match your filters
        </div>
      ) : groupByDate && grouped ? (
        <div>
          {grouped.map(group => (
            <div key={group.name}>
              <div className="px-5 py-1.5 bg-graphite-50 dark:bg-graphite-800/50 border-b border-graphite-100 dark:border-graphite-800">
                <h3 className="text-[10px] font-semibold uppercase tracking-wide text-graphite-500 dark:text-graphite-400">
                  {group.name === "Pinned" ? "📌 " : ""}{group.name}
                  <span className="ml-2 text-graphite-400 dark:text-graphite-500 normal-case font-normal">{group.jobs.length}</span>
                </h3>
              </div>
              {group.jobs.map(job => (
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
                    <JobCard job={job} density={density} />
                  </div>
                </div>
              ))}
            </div>
          ))}
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
              <JobCard job={job} density={density} />
            </div>
          </div>
        ))
      )}
      {showAssignClientModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !isLoading && setShowAssignClientModal(false)}
        >
          <div
            className="bg-white dark:bg-graphite-900 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-1 text-graphite-900 dark:text-white">
              Assign Client
            </h2>
            <p className="text-xs text-graphite-500 dark:text-graphite-400 mb-4">
              Assign {selected.size} selected job(s) to a client
            </p>
            <input
              type="text"
              autoFocus
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full px-3 py-2 text-sm rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 text-graphite-900 dark:text-white focus:outline-none focus:border-cyan mb-3"
            />
            <div className="max-h-60 overflow-y-auto border border-graphite-200 dark:border-graphite-700 rounded">
              <button
                type="button"
                onClick={() => setSelectedClientId("__clear__")}
                className={`w-full text-left px-3 py-2 text-sm border-b border-graphite-100 dark:border-graphite-800 ${
                  selectedClientId === "__clear__"
                    ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan"
                    : "hover:bg-graphite-50 dark:hover:bg-graphite-800 text-graphite-700 dark:text-graphite-200"
                }`}
              >
                <span className="italic">— Clear client —</span>
              </button>
              {clients
                .filter((c) => {
                  if (!clientSearch.trim()) return true;
                  const q = clientSearch.toLowerCase();
                  return (
                    c.name.toLowerCase().includes(q) ||
                    (c.email || "").toLowerCase().includes(q)
                  );
                })
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedClientId(c.id)}
                    className={`w-full text-left px-3 py-2 text-sm border-b border-graphite-100 dark:border-graphite-800 ${
                      selectedClientId === c.id
                        ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan"
                        : "hover:bg-graphite-50 dark:hover:bg-graphite-800 text-graphite-700 dark:text-graphite-200"
                    }`}
                  >
                    <div className="font-medium">{c.name}</div>
                    {c.email && (
                      <div className="text-xs text-graphite-500 dark:text-graphite-400">
                        {c.email}
                      </div>
                    )}
                  </button>
                ))}
              {clients.length === 0 && (
                <div className="px-3 py-4 text-sm text-center text-graphite-400">
                  No clients yet
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowAssignClientModal(false)}
                disabled={isLoading}
                className="px-4 py-2 text-sm rounded border border-graphite-200 dark:border-graphite-700 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={bulkAssignClient}
                disabled={isLoading || selectedClientId === null}
                className="px-4 py-2 text-sm rounded bg-cyan text-white font-semibold hover:bg-cyan-600 disabled:opacity-50"
              >
                {isLoading ? "Applying..." : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
