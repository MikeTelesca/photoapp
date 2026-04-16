"use client";

import { useEffect, useState } from "react";

export type UserPreset = {
  id: string;
  name: string;
  slug: string;
  prompt: string;
  gradient: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (p: UserPreset) => void;
  onDeleted?: (id: string) => void;
  initial?: UserPreset | null;
};

// Six curated gradient choices real estate photographers gravitate toward —
// plus a Custom slot that accepts any Tailwind-arbitrary CSS gradient string.
export const GRADIENT_CHOICES: { label: string; value: string }[] = [
  { label: "Dusk", value: "linear-gradient(135deg,#0f172a 0%,#7c3aed 55%,#f59e0b 100%)" },
  { label: "Sunset", value: "linear-gradient(135deg,#7c2d12 0%,#f97316 55%,#fde68a 100%)" },
  { label: "Ocean", value: "linear-gradient(135deg,#0c4a6e 0%,#0891b2 55%,#a5f3fc 100%)" },
  { label: "Forest", value: "linear-gradient(135deg,#064e3b 0%,#059669 55%,#d1fae5 100%)" },
  { label: "Graphite", value: "linear-gradient(135deg,#111827 0%,#374151 55%,#9ca3af 100%)" },
  { label: "Editorial", value: "linear-gradient(135deg,#1e293b 0%,#db2777 55%,#fbbf24 100%)" },
];

export function PresetEditor({ open, onClose, onSaved, onDeleted, initial }: Props) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [gradient, setGradient] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setPrompt(initial?.prompt ?? "");
    setGradient(initial?.gradient ?? null);
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
      const endpoint = initial ? `/api/presets/${initial.id}` : "/api/presets";
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, prompt, gradient }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string })?.error || "Could not save preset");
      }
      const saved = (await res.json()) as UserPreset;
      onSaved(saved);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save preset");
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!initial) return;
    if (!confirm(`Delete preset "${initial.name}"? This can't be undone.`)) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/presets/${initial.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete preset");
      onDeleted?.(initial.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete preset");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-graphite-900 border border-graphite-800 rounded-3xl shadow-2xl my-4">
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-graphite-800">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan mb-1">
              {initial ? "Edit preset" : "New preset"}
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              {initial ? initial.name : "Craft a look"}
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

        <div className="px-6 sm:px-8 py-6 space-y-6">
          <div>
            <label className="text-[11px] uppercase tracking-[0.2em] text-graphite-500 mb-2 block">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Airbnb bright"
              className="w-full h-11 px-4 rounded-xl bg-graphite-950 border border-graphite-800 text-sm text-white placeholder:text-graphite-600 focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.2em] text-graphite-500 mb-2 block">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={8}
              placeholder="Describe the look. The AI follows this prompt literally — be specific about exposure, contrast, color, and what NOT to change."
              className="w-full px-4 py-3 rounded-xl bg-graphite-950 border border-graphite-800 text-sm text-white placeholder:text-graphite-600 focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition font-mono leading-relaxed resize-y"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.2em] text-graphite-500 mb-2 block">
              Tile preview
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {GRADIENT_CHOICES.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGradient(g.value)}
                  className={`relative aspect-[4/3] rounded-xl overflow-hidden transition-all ${
                    gradient === g.value ? "ring-2 ring-cyan scale-[1.02]" : "ring-1 ring-graphite-800 hover:ring-graphite-600"
                  }`}
                  style={{ backgroundImage: g.value }}
                >
                  <span className="absolute bottom-1.5 left-0 right-0 text-[10px] uppercase tracking-[0.2em] text-white/90 text-center">
                    {g.label}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-graphite-500 mb-1.5 block">
                or custom CSS
              </label>
              <input
                value={gradient ?? ""}
                onChange={(e) => setGradient(e.target.value || null)}
                placeholder="linear-gradient(135deg,#000,#fff)"
                className="w-full h-9 px-3 rounded-lg bg-graphite-950 border border-graphite-800 text-xs text-white placeholder:text-graphite-600 focus:outline-none focus:border-cyan font-mono"
              />
            </div>
          </div>

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
              disabled={saving || !name.trim() || !prompt.trim()}
              className="h-10 px-5 rounded-xl bg-cyan text-graphite-950 text-sm font-semibold hover:bg-cyan-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : initial ? "Save changes" : "Create preset"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
