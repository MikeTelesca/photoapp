"use client";
import { useState } from "react";
import { InfoTooltip } from "@/components/ui/info-tooltip";

export function BudgetInput({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetPerJob: value }),
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
    <div className="flex gap-2 items-center">
      <InfoTooltip text="If a job's estimated cost exceeds this, you'll see a confirmation prompt before processing starts." position="bottom" />
      <span className="text-xs">$</span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
        className="w-24 text-sm px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
      />
      <button
        onClick={save}
        disabled={saving}
        data-save
        className="text-xs px-3 py-1 rounded bg-cyan text-white font-semibold disabled:opacity-50"
      >
        {saved ? "Saved ✓" : saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
