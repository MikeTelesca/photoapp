"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addToHistory, getHistory, clearHistory } from "@/lib/search-history";

interface JobResult { id: string; address: string; clientName?: string | null; status: string; totalPhotos: number; }
interface ClientResult { id: string; name: string; email?: string | null; company?: string | null; }

const NAV_SHORTCUTS = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "New Job", href: "/jobs/new", icon: "➕" },
  { label: "Clients", href: "/clients", icon: "👥" },
  { label: "Templates", href: "/templates", icon: "📋" },
  { label: "Presets", href: "/presets", icon: "🎨" },
  { label: "Playground", href: "/playground", icon: "🧪" },
  { label: "Analytics", href: "/analytics", icon: "📊" },
  { label: "Billing", href: "/billing", icon: "💳" },
  { label: "Activity", href: "/activity", icon: "📜" },
  { label: "Search", href: "/search", icon: "🔍" },
  { label: "Settings", href: "/settings", icon: "⚙" },
  { label: "Help", href: "/help", icon: "❓" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [clients, setClients] = useState<ClientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Global keyboard shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Custom event from topbar button
  useEffect(() => {
    function openHandler() { setOpen(true); }
    window.addEventListener("open-command-palette", openHandler);
    return () => window.removeEventListener("open-command-palette", openHandler);
  }, []);

  // Focus input when opened & load history
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIdx(0);
      setHistory(getHistory());
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (!query) { setJobs([]); setClients([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/palette?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setJobs(data.jobs || []);
        setClients(data.clients || []);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open]);

  // Build flat results list for keyboard navigation
  const filteredNav = query
    ? NAV_SHORTCUTS.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
    : NAV_SHORTCUTS.slice(0, 6);

  const allResults: Array<{ type: string; href: string; label: string; sub?: string; icon?: string }> = [
    ...filteredNav.map(n => ({ type: "nav", href: n.href, label: n.label, icon: n.icon })),
    ...jobs.map(j => ({
      type: "job",
      href: `/review/${j.id}`,
      label: j.address,
      sub: `${j.status} · ${j.totalPhotos} photos${j.clientName ? ` · ${j.clientName}` : ""}`,
      icon: "📷",
    })),
    ...clients.map(c => ({
      type: "client",
      href: `/clients/${c.id}`,
      label: c.name,
      sub: [c.company, c.email].filter(Boolean).join(" · "),
      icon: "👤",
    })),
  ];

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  function recordQuery() {
    if (query && query.length >= 2) {
      addToHistory(query);
      setHistory(getHistory());
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      recordQuery();
      const r = allResults[selectedIdx];
      if (r) {
        setOpen(false);
        router.push(r.href);
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] p-4 bg-black/40"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white dark:bg-graphite-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search jobs, clients, or jump to..."
          className="w-full px-4 py-3 text-sm bg-transparent border-b border-graphite-100 dark:border-graphite-800 focus:outline-none dark:text-white"
        />
        <div className="max-h-[60vh] overflow-y-auto">
          {!query && history.length > 0 ? (
            <>
              <div className="flex justify-between items-center px-3 py-1.5 text-[10px] text-graphite-400 uppercase tracking-wide">
                <span>Recent searches</span>
                <button onClick={() => { clearHistory(); setHistory([]); }}
                  className="text-graphite-400 hover:text-red-500 normal-case">
                  Clear
                </button>
              </div>
              {history.map(h => (
                <button key={h} onClick={() => { setQuery(h); }}
                  className="block w-full text-left px-3 py-1.5 text-xs hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:text-graphite-300">
                  🕓 {h}
                </button>
              ))}
            </>
          ) : allResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-graphite-400">
              {loading ? "Searching..." : query ? "No matches" : "Type to search"}
            </div>
          ) : (
            <ul>
              {allResults.map((r, i) => (
                <li key={`${r.type}-${r.href}-${i}`}>
                  <Link
                    href={r.href}
                    onClick={() => { recordQuery(); setOpen(false); }}
                    className={`flex items-center gap-3 px-4 py-2 text-sm ${
                      i === selectedIdx ? "bg-cyan-50 dark:bg-cyan-900/20" : ""
                    } hover:bg-graphite-50 dark:hover:bg-graphite-800`}
                  >
                    <span className="text-base">{r.icon || "•"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium dark:text-white truncate">{r.label}</div>
                      {r.sub && (
                        <div className="text-[11px] text-graphite-500 dark:text-graphite-400 truncate">{r.sub}</div>
                      )}
                    </div>
                    <span className="text-[10px] text-graphite-400 uppercase tracking-wide">{r.type}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-graphite-50 dark:bg-graphite-800 text-[10px] text-graphite-500 dark:text-graphite-400">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
          <span className="ml-auto">⌘K toggle</span>
        </div>
      </div>
    </div>
  );
}
