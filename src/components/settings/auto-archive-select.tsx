"use client";
import { useState } from "react";

interface Props {
  initial: number | null;
}

export function AutoArchiveSelect({ initial }: Props) {
  const [value, setValue] = useState<number | null>(initial);
  const [saved, setSaved] = useState(false);

  async function save(newVal: number | null) {
    setValue(newVal);
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoArchiveDays: newVal }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    } catch (err) {
      console.error("Failed to save auto-archive setting:", err);
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <select
        value={value ?? ""}
        onChange={(e) => save(e.target.value === "" ? null : parseInt(e.target.value))}
        className="text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
      >
        <option value="">Disabled (manual only)</option>
        <option value="14">After 14 days</option>
        <option value="30">After 30 days</option>
        <option value="60">After 60 days</option>
        <option value="90">After 90 days</option>
        <option value="180">After 6 months</option>
      </select>
      {saved && <span className="text-xs text-emerald-600 font-semibold">Saved ✓</span>}
    </div>
  );
}
