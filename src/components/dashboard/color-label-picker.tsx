"use client";
import { useState } from "react";

const COLORS: Array<{ key: string | null; bg: string; label: string }> = [
  { key: null, bg: "bg-transparent border-graphite-300 dark:border-graphite-600", label: "None" },
  { key: "red", bg: "bg-red-500", label: "Red" },
  { key: "amber", bg: "bg-amber-500", label: "Amber" },
  { key: "emerald", bg: "bg-emerald-500", label: "Green" },
  { key: "blue", bg: "bg-blue-500", label: "Blue" },
  { key: "purple", bg: "bg-purple-500", label: "Purple" },
  { key: "pink", bg: "bg-pink-500", label: "Pink" },
];

interface Props {
  jobId: string;
  current?: string | null;
}

export function ColorLabelPicker({ jobId, current }: Props) {
  const [value, setValue] = useState(current || null);
  const [open, setOpen] = useState(false);

  async function pick(c: string | null) {
    setValue(c);
    setOpen(false);
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colorLabel: c }),
    });
  }

  const currentColor = COLORS.find(c => c.key === value);

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button onClick={(e) => { e.preventDefault(); setOpen(!open); }}
        className={`w-4 h-4 rounded-full border ${currentColor?.bg || COLORS[0].bg} hover:scale-110 transition-transform`}
        title={`Color label: ${currentColor?.label || "None"}`}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 flex gap-1 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-full p-1.5 shadow-lg">
            {COLORS.map(c => (
              <button
                key={c.key || "none"}
                onClick={(e) => { e.preventDefault(); pick(c.key); }}
                className={`w-5 h-5 rounded-full border-2 ${c.bg} ${value === c.key ? "border-graphite-900 dark:border-white" : "border-transparent"}`}
                title={c.label}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
