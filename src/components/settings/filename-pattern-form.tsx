"use client";
import { useState } from "react";
import { previewPattern } from "@/lib/filename-pattern";

export function FilenamePatternForm({ initial }: { initial: string | null }) {
  const [pattern, setPattern] = useState(initial || "{address}-{seq}");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const preview = previewPattern(pattern);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filenamePattern: pattern }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white font-mono"
          placeholder="{address}-{seq}"
        />
        <div className="text-[11px] text-graphite-400 mt-1">
          Available: <code>{"{address}"}</code> <code>{"{client}"}</code>{" "}
          <code>{"{date}"}</code> <code>{"{preset}"}</code>{" "}
          <code>{"{photographer}"}</code> <code>{"{seq}"}</code>
        </div>
      </div>
      <div className="text-xs px-2 py-1 rounded bg-graphite-50 dark:bg-graphite-800">
        Preview: <code className="font-semibold dark:text-white">{preview}</code>
      </div>
      <div className="flex justify-end items-center gap-2">
        {saved && (
          <span className="text-xs text-emerald-600 font-semibold">Saved ✓</span>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="text-xs px-3 py-1 rounded bg-cyan text-white font-semibold"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
