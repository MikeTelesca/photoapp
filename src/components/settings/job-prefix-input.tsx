"use client";

import { useState } from "react";

export function JobPrefixInput({ initial }: { initial: string | null }) {
  const [value, setValue] = useState(initial || "JOB");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobSequencePrefix: value.toUpperCase() }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase().slice(0, 8))}
        placeholder="JOB"
        className="w-24 text-sm px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white font-mono"
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-xs px-3 py-1 rounded bg-cyan text-white font-semibold disabled:opacity-50"
      >
        {saved ? "Saved ✓" : "Save"}
      </button>
      <span className="text-[11px] text-graphite-400">
        e.g., {value || "JOB"}-2026-0042
      </span>
    </div>
  );
}
