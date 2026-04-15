"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  templateId: string;
  initialPattern: string | null;
  initialEnabled: boolean;
}

export function RecurrencePicker({ templateId, initialPattern, initialEnabled }: Props) {
  const [pattern, setPattern] = useState(initialPattern || "");
  const [enabled, setEnabled] = useState(initialEnabled);
  const router = useRouter();

  async function update(newPattern: string, newEnabled: boolean) {
    await fetch(`/api/templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recurrencePattern: newPattern || null,
        recurrenceEnabled: newEnabled,
      }),
    });
    router.refresh();
  }

  return (
    <div className="flex gap-1 items-center">
      <select
        value={pattern}
        onChange={(e) => {
          setPattern(e.target.value);
          update(e.target.value, enabled);
        }}
        className="text-xs px-2 py-0.5 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
      >
        <option value="">No recurrence</option>
        <option value="weekly">Weekly</option>
        <option value="biweekly">Biweekly</option>
        <option value="monthly">Monthly</option>
      </select>
      {pattern && (
        <button
          onClick={() => {
            setEnabled(!enabled);
            update(pattern, !enabled);
          }}
          className={`text-[10px] px-2 py-0.5 rounded ${
            enabled ? "bg-emerald-500 text-white" : "border border-graphite-200 dark:border-graphite-700"
          }`}
        >
          {enabled ? "Active" : "Paused"}
        </button>
      )}
    </div>
  );
}
