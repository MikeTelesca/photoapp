"use client";
import { useState } from "react";

interface Props {
  initialShareSubject: string | null;
  initialJobReadySubject: string | null;
}

export function EmailSubjectForm({ initialShareSubject, initialJobReadySubject }: Props) {
  const [shareSubject, setShareSubject] = useState(initialShareSubject || "");
  const [jobReadySubject, setJobReadySubject] = useState(initialJobReadySubject || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareEmailSubject: shareSubject.trim() || null,
          jobReadyEmailSubject: jobReadySubject.trim() || null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-graphite-500 dark:text-graphite-400">
        Available tokens: <code className="text-xs">{"{address}"}</code> <code className="text-xs">{"{client}"}</code> <code className="text-xs">{"{photographer}"}</code> <code className="text-xs">{"{count}"}</code>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1 dark:text-white">Share link email subject</label>
        <input
          type="text"
          value={shareSubject}
          onChange={(e) => setShareSubject(e.target.value)}
          placeholder="Photos ready: {address}"
          className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1 dark:text-white">Job-ready email subject</label>
        <input
          type="text"
          value={jobReadySubject}
          onChange={(e) => setJobReadySubject(e.target.value)}
          placeholder="Ready for review: {address}"
          className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
        />
      </div>

      <div className="flex justify-end items-center gap-2">
        {saved && <span className="text-xs text-emerald-600 font-semibold">Saved ✓</span>}
        <button
          onClick={save}
          disabled={saving}
          className="text-xs px-3 py-1 rounded bg-cyan text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? "..." : "Save"}
        </button>
      </div>
    </div>
  );
}
