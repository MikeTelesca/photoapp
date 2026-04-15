"use client";
import { useState } from "react";

interface Props {
  initial: boolean;
}

export function TagsInheritToggle({ initial }: Props) {
  const [enabled, setEnabled] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const newVal = !enabled;
    setEnabled(newVal);
    setSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagsInheritFromJob: newVal }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className="flex items-center justify-between py-3 cursor-pointer">
      <div>
        <div className="text-sm font-medium dark:text-white">Inherit photo tags from job tags</div>
        <div className="text-xs text-graphite-500 dark:text-graphite-400">
          When enabled, newly ingested photos automatically copy the job&apos;s tags into their auto-tags (merged, deduped).
        </div>
      </div>
      <input
        type="checkbox"
        className="sr-only"
        checked={enabled}
        onChange={toggle}
        disabled={saving}
      />
      <button
        type="button"
        onClick={toggle}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ml-4 ${
          enabled ? "bg-emerald-500" : "bg-graphite-300 dark:bg-graphite-700"
        }`}
        disabled={saving}
        aria-pressed={enabled}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
