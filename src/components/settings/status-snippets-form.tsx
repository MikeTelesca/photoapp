"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";

const STATUSES = ["pending", "processing", "review", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];
export type StatusSnippetMap = Record<Status, string[]>;

const STATUS_META: Record<Status, { label: string; color: string; emoji: string }> = {
  pending: { label: "Pending", color: "bg-graphite-100 text-graphite-700", emoji: "⏳" },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-700", emoji: "⚙️" },
  review: { label: "Review", color: "bg-amber-100 text-amber-700", emoji: "👀" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", emoji: "✅" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", emoji: "⛔" },
};

export function StatusSnippetsForm({ initial }: { initial: StatusSnippetMap }) {
  const [snippets, setSnippets] = useState<StatusSnippetMap>(initial);
  const [drafts, setDrafts] = useState<Record<Status, string>>({
    pending: "",
    processing: "",
    review: "",
    approved: "",
    rejected: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(next: StatusSnippetMap) {
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusSnippets: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function addSnippet(status: Status) {
    const text = drafts[status].trim();
    if (!text) return;
    const next: StatusSnippetMap = {
      ...snippets,
      [status]: [...snippets[status], text],
    };
    setSnippets(next);
    setDrafts({ ...drafts, [status]: "" });
    void persist(next);
  }

  function removeSnippet(status: Status, idx: number) {
    const next: StatusSnippetMap = {
      ...snippets,
      [status]: snippets[status].filter((_, i) => i !== idx),
    };
    setSnippets(next);
    void persist(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs">
        {saving && <span className="text-graphite-400">Saving…</span>}
        {saved && <span className="text-emerald-600">Saved</span>}
        {error && <span className="text-red-500">{error}</span>}
      </div>
      {STATUSES.map((status) => {
        const meta = STATUS_META[status];
        const list = snippets[status];
        return (
          <Card key={status}>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${meta.color}`}>
                  {meta.emoji} {meta.label}
                </span>
                <span className="text-[11px] text-graphite-400">
                  {list.length} snippet{list.length === 1 ? "" : "s"}
                </span>
              </div>

              {list.length > 0 && (
                <ul className="divide-y divide-graphite-100 dark:divide-graphite-800">
                  {list.map((snip, idx) => (
                    <li key={`${status}-${idx}`} className="py-2 flex items-start gap-3">
                      <div className="flex-1 text-xs whitespace-pre-wrap text-graphite-700 dark:text-graphite-200">
                        {snip}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSnippet(status, idx)}
                        className="text-[11px] text-red-500 hover:underline flex-shrink-0"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <textarea
                  value={drafts[status]}
                  onChange={(e) => setDrafts({ ...drafts, [status]: e.target.value })}
                  rows={2}
                  placeholder={`Add a snippet for ${meta.label.toLowerCase()} jobs…`}
                  className="flex-1 text-xs px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan"
                />
                <button
                  type="button"
                  onClick={() => addSnippet(status)}
                  disabled={!drafts[status].trim()}
                  className="text-xs px-3 py-2 rounded bg-cyan text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed self-start"
                >
                  Add
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
