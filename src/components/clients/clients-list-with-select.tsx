"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkline } from "@/components/clients/sparkline";

interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  _count?: { jobs: number };
  sparkline?: number[];
}

export function ClientsListWithSelect({ clients }: { clients: Client[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  function toggle(id: string) {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelected(newSet);
  }

  function selectAll() {
    setSelected(new Set(clients.map(c => c.id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected clients? Clients with active jobs will be skipped.`)) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/clients/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: [...selected] }),
      });
      const data = await res.json();
      alert(`Deleted ${data.deleted} clients${data.message ? `\n${data.message}` : ""}`);
      setSelected(new Set());
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-2 px-5 py-2 bg-cyan-50 dark:bg-cyan-900/20 border-b border-cyan-200 dark:border-cyan-800 text-sm">
          <span className="font-semibold text-cyan">{selected.size} selected</span>
          <button onClick={bulkDelete} disabled={deleting}
            className="text-xs px-3 py-1 rounded bg-red-500 text-white font-semibold">
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <button onClick={selectAll} className="ml-auto text-xs text-cyan">Select all</button>
          <button onClick={clearAll} className="text-xs text-graphite-500">Clear</button>
        </div>
      )}
      <ul className="divide-y divide-graphite-100 dark:divide-graphite-800">
        {clients.map(c => (
          <li key={c.id} className="flex items-center gap-3 py-3 px-4 hover:bg-graphite-50 dark:hover:bg-graphite-800 transition-colors">
            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)}
              onClick={(e) => e.stopPropagation()} />
            <Link href={`/clients/${c.id}`} className="flex-1 flex justify-between">
              <div>
                <div className="text-sm font-medium dark:text-white">{c.name}</div>
                <div className="text-xs text-graphite-500 dark:text-graphite-400">
                  {[c.company, c.email, c.phone].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {c.sparkline && (
                  <Sparkline
                    values={c.sparkline}
                    className="text-cyan shrink-0"
                  />
                )}
                <div className="text-xs text-graphite-400">
                  {c._count?.jobs || 0} {c._count?.jobs === 1 ? "job" : "jobs"}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
