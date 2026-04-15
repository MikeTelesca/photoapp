"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface JobResult { id: string; address: string; }
interface ClientResult { id: string; name: string; }

export function SidebarSearch() {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [clients, setClients] = useState<ClientResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query) {
      setJobs([]);
      setClients([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/palette?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setJobs((data.jobs || []).slice(0, 3));
        setClients((data.clients || []).slice(0, 2));
      } catch {}
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const hasResults = jobs.length > 0 || clients.length > 0;
  const showDropdown = open && query && hasResults;

  function handleEnter() {
    const firstJob = jobs[0];
    const firstClient = clients[0];
    
    if (firstJob) {
      setQuery("");
      setOpen(false);
      router.push(`/review/${firstJob.id}`);
    } else if (firstClient) {
      setQuery("");
      setOpen(false);
      router.push(`/clients/${firstClient.id}`);
    }
  }

  return (
    <div ref={containerRef} className="relative px-3 pt-3 pb-2">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter") handleEnter(); if (e.key === "Escape") setOpen(false); }}
          placeholder="Quick find..."
          className="w-full text-xs pl-7 pr-2 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 dark:text-white"
        />
        <svg className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-graphite-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103 10.5a7.5 7.5 0 0013.65 6.15z" />
        </svg>
      </div>

      {showDropdown && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {jobs.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide font-semibold text-graphite-400">Jobs</div>
              {jobs.map(j => (
                <Link key={j.id} href={`/review/${j.id}`} onClick={() => { setOpen(false); setQuery(""); }}
                  className="block px-3 py-1.5 text-xs hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:text-white truncate">
                  📷 {j.address}
                </Link>
              ))}
            </div>
          )}
          {clients.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide font-semibold text-graphite-400">Clients</div>
              {clients.map(c => (
                <Link key={c.id} href={`/clients/${c.id}`} onClick={() => { setOpen(false); setQuery(""); }}
                  className="block px-3 py-1.5 text-xs hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:text-white truncate">
                  👤 {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
