"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PRESETS = [
  { value: "mls-standard", label: "MLS Standard" },
  { value: "standard", label: "Standard" },
  { value: "bright", label: "Bright & Airy" },
  { value: "luxury", label: "Luxury" },
  { value: "flambient", label: "Flambient" },
];

export function InlinePresetSwitch({ jobId, current }: { jobId: string; current: string }) {
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function change(newValue: string) {
    if (newValue === value) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: newValue }),
      });
      if (res.ok) {
        setValue(newValue);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={value}
      onChange={(e) => { e.stopPropagation(); change(e.target.value); }}
      onClick={(e) => e.stopPropagation()}
      disabled={saving}
      className="text-[10px] px-1 py-0.5 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white font-semibold uppercase tracking-wide"
    >
      {PRESETS.map(p => (
        <option key={p.value} value={p.value}>{p.label}</option>
      ))}
    </select>
  );
}
