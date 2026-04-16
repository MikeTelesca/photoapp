"use client";

import { useState } from "react";
import { AgentAvatar } from "@/components/jobs/agent-picker";
import { AgentEditor, AgentRow } from "./agent-editor";

type Props = {
  initialAgents: AgentRow[];
};

export function AgentsManager({ initialAgents }: Props) {
  const [agents, setAgents] = useState<AgentRow[]>(initialAgents);
  const [editing, setEditing] = useState<AgentRow | null>(null);
  const [creating, setCreating] = useState(false);

  function onSaved(a: AgentRow) {
    setAgents((xs) => {
      const i = xs.findIndex((x) => x.id === a.id);
      if (i >= 0) {
        const next = xs.slice();
        next[i] = { ...xs[i], ...a };
        return next.sort((x, y) => x.name.localeCompare(y.name));
      }
      return [...xs, { ...a, jobCount: a.jobCount ?? 0 }].sort((x, y) => x.name.localeCompare(y.name));
    });
  }
  function onDeleted(id: string) {
    setAgents((xs) => xs.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan/15 via-cyan/5 to-transparent border border-cyan/30 hover:border-cyan/60 transition-all p-6 text-left min-h-[180px] flex flex-col justify-between"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(34,211,238,0.22),transparent_55%)] opacity-70 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan/80 mb-2">
              Add to roster
            </div>
            <div className="text-3xl font-semibold text-white tracking-tight leading-[1.05]">
              New agent
            </div>
          </div>
          <div className="relative flex items-end justify-between">
            <p className="text-sm text-graphite-400 max-w-[70%] leading-snug">
              Creates a Dropbox folder for their properties.
            </p>
            <div className="w-11 h-11 rounded-full bg-cyan text-graphite-950 flex items-center justify-center shadow-lg shadow-cyan/30 group-hover:scale-110 transition-transform">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9H15M9 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </button>

        {agents.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => {
              setEditing(a);
              setCreating(false);
            }}
            className="group relative rounded-3xl bg-graphite-900 border border-graphite-800 hover:border-graphite-700 overflow-hidden text-left p-5 min-h-[180px] flex flex-col justify-between transition-all"
          >
            <div className="flex items-start gap-3">
              <AgentAvatar name={a.name} />
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold text-white truncate leading-tight">
                  {a.name}
                </div>
                {a.email && (
                  <div className="text-xs text-graphite-400 truncate mt-0.5">{a.email}</div>
                )}
                {a.phone && (
                  <div className="text-[11px] text-graphite-500 truncate">{a.phone}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-graphite-950 border border-graphite-800 text-[11px] text-graphite-300">
                {a.jobCount} {a.jobCount === 1 ? "job" : "jobs"}
              </span>
              {a.dropboxFolder && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan/10 border border-cyan/30 text-[11px] text-cyan">
                  📁 Dropbox
                </span>
              )}
            </div>
            <div className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.2em] text-graphite-500 opacity-0 group-hover:opacity-100 transition-opacity">
              Edit
            </div>
          </button>
        ))}
      </div>

      {agents.length === 0 && (
        <p className="text-sm text-graphite-500">
          No agents yet. Hit <span className="text-cyan">New agent</span> to add your first one —
          BatchBase will create their Dropbox folder automatically.
        </p>
      )}

      <AgentEditor
        open={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={onSaved}
        onDeleted={onDeleted}
        initial={editing}
      />
    </div>
  );
}
