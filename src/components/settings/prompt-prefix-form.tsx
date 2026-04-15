"use client";
import { useState } from "react";
import { PromptLinter } from "@/components/presets/prompt-linter";
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface Props {
  initial: string | null;
}

export function PromptPrefixForm({ initial }: Props) {
  const [value, setValue] = useState(initial || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptPrefix: value.trim() || null }),
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
      <div className="flex items-center gap-1">
        <p className="text-xs text-graphite-500 dark:text-graphite-400">
          These instructions are prepended to every enhance prompt. Use to enforce your personal style across all jobs.
        </p>
        <InfoTooltip text="These instructions are prepended to every AI enhance prompt. Useful for enforcing your personal style consistently." />
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Always preserve cool blue tones in interiors. Never crop ceilings. Avoid heavy yellow casts in kitchens."
        className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white font-mono"
      />
      <PromptLinter text={value} />
      <div className="flex justify-end items-center gap-2">
        {saved && <span className="text-xs text-emerald-600 font-semibold">Saved ✓</span>}
        <button
          onClick={save}
          disabled={saving}
          data-save
          className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
