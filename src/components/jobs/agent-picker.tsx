"use client";

import { useEffect, useRef, useState } from "react";

export type Agent = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  dropboxFolder?: string | null;
};

type Props = {
  value: Agent | null;
  onChange: (agent: Agent | null) => void;
};

// Combobox that loads the user's agents, lets them search/select, and
// creates a new one inline via POST /api/agents.
export function AgentPicker({ value, onChange }: Props) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/agents", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as unknown;
        if (!cancelled && Array.isArray(data)) setAgents(data as Agent[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? agents.filter((a) => a.name.toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q))
    : agents;
  const canCreate =
    query.trim().length >= 2 &&
    !agents.some((a) => a.name.toLowerCase() === query.trim().toLowerCase());

  async function createAgent() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string })?.error || "Could not create agent");
      }
      const agent = (await res.json()) as Agent;
      setAgents((a) => [...a, agent].sort((x, y) => x.name.localeCompare(y.name)));
      onChange(agent);
      setQuery("");
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create agent");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div
        role="button"
        tabIndex={0}
        className="w-full h-11 px-4 rounded-xl bg-graphite-950 border border-graphite-800 flex items-center justify-between cursor-pointer hover:border-graphite-700 focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        {value ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <AgentAvatar name={value.name} />
            <div className="min-w-0">
              <div className="text-sm text-white font-medium truncate">{value.name}</div>
              {value.dropboxFolder && (
                <div className="text-[11px] text-graphite-500 truncate">
                  📁 {value.dropboxFolder}
                </div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-sm text-graphite-500">Pick an agent or add a new one</span>
        )}
        <span className="flex items-center gap-2 flex-shrink-0">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="text-graphite-500 hover:text-white text-xs"
              title="Clear"
            >
              ✕
            </button>
          )}
          <svg width="12" height="12" viewBox="0 0 12 12" className="text-graphite-500">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      {open && (
        <div className="absolute z-10 left-0 right-0 mt-1.5 bg-graphite-900 border border-graphite-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-graphite-800">
            <input
              autoFocus
              className="w-full h-9 px-3 rounded-lg bg-graphite-950 border border-graphite-800 text-[13px] text-white placeholder:text-graphite-600 focus:outline-none focus:border-cyan"
              placeholder="Search or add new agent…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreate) {
                  e.preventDefault();
                  void createAgent();
                }
              }}
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading && agents.length === 0 && (
              <div className="px-4 py-3 text-[13px] text-graphite-500">Loading…</div>
            )}
            {!loading && filtered.length === 0 && !canCreate && (
              <div className="px-4 py-3 text-[13px] text-graphite-500">
                No agents yet. Type a name to add your first one.
              </div>
            )}
            {filtered.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  onChange(a);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-graphite-800 transition"
              >
                <AgentAvatar name={a.name} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{a.name}</div>
                  {a.email && (
                    <div className="text-[11px] text-graphite-500 truncate">{a.email}</div>
                  )}
                </div>
                {value?.id === a.id && (
                  <span className="text-cyan text-xs flex-shrink-0">✓</span>
                )}
              </button>
            ))}
          </div>

          {canCreate && (
            <div className="border-t border-graphite-800 p-2">
              <button
                type="button"
                onClick={createAgent}
                disabled={creating}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan/10 text-cyan text-[13px] font-medium hover:bg-cyan/20 disabled:opacity-50 transition"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                {creating ? "Creating…" : `Add "${query.trim()}" as new agent`}
              </button>
              {error && <div className="mt-1.5 text-[11px] text-red-300">{error}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const palette = ["bg-cyan/25 text-cyan", "bg-amber-500/20 text-amber-300", "bg-emerald-500/20 text-emerald-300", "bg-fuchsia-500/20 text-fuchsia-300", "bg-sky-500/20 text-sky-300"];
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const cls = palette[hash % palette.length];
  return (
    <span
      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${cls}`}
    >
      {initials}
    </span>
  );
}
