"use client";

import { useEffect, useState } from "react";

export type AgentRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  dropboxFolder: string | null;
  dropboxShareUrl: string | null;
  jobCount: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (a: AgentRow) => void;
  onDeleted?: (id: string) => void;
  initial?: AgentRow | null;
};

// Create/edit modal for Agents. Mirrors PresetEditor styling.
export function AgentEditor({ open, onClose, onSaved, onDeleted, initial }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setEmail(initial?.email ?? "");
    setPhone(initial?.phone ?? "");
    setNotes(initial?.notes ?? "");
    setError("");
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  async function save() {
    setSaving(true);
    setError("");
    try {
      const endpoint = initial ? `/api/agents/${initial.id}` : "/api/agents";
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string })?.error || "Could not save agent");
      }
      const saved = (await res.json()) as AgentRow;
      onSaved(saved);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save agent");
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!initial) return;
    if (!confirm(`Delete agent "${initial.name}"? Jobs stay but lose the link to this agent.`))
      return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/agents/${initial.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete agent");
      onDeleted?.(initial.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete agent");
    } finally {
      setDeleting(false);
    }
  }

  const inputCls =
    "w-full h-11 px-4 rounded-xl bg-graphite-950 border border-graphite-800 text-sm text-white placeholder:text-graphite-600 focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition";
  const labelCls = "text-[11px] uppercase tracking-[0.2em] text-graphite-500 mb-2 block";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-graphite-900 border border-graphite-800 rounded-3xl shadow-2xl my-4">
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-graphite-800">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan mb-1">
              {initial ? "Edit agent" : "New agent"}
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              {initial ? initial.name : "Add to roster"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full border border-graphite-800 text-graphite-400 hover:text-white hover:border-graphite-600 transition flex items-center justify-center"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 sm:px-8 py-6 space-y-5">
          <div>
            <label className={labelCls}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Jane Rivera"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className={inputCls}
                placeholder="jane@brokerage.com"
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls}
                placeholder="(303) 555-0183"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`${inputCls} h-auto py-3 resize-y`}
              placeholder="Favorite looks, turnaround expectations, anything you'd want on the next shoot."
            />
          </div>

          {initial?.dropboxFolder && (
            <div className="rounded-xl bg-graphite-950 border border-graphite-800 p-3 text-xs text-graphite-400">
              <div className="text-[10px] uppercase tracking-[0.2em] text-graphite-500 mb-1">
                Dropbox folder
              </div>
              <div className="font-mono text-graphite-300 break-all">{initial.dropboxFolder}</div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-300 bg-red-950/40 border border-red-900/60 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-t border-graphite-800">
          <div>
            {initial && (
              <button
                type="button"
                onClick={del}
                disabled={deleting}
                className="h-10 px-4 rounded-xl text-sm font-medium text-red-300 hover:text-red-200 hover:bg-red-950/30 disabled:opacity-40 transition"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="h-10 px-4 rounded-xl text-sm font-medium text-graphite-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !name.trim()}
              className="h-10 px-5 rounded-xl bg-cyan text-graphite-950 text-sm font-semibold hover:bg-cyan-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : initial ? "Save changes" : "Create agent"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
