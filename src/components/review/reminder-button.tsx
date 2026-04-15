"use client";
import { useState } from "react";

interface Props {
  jobId: string;
  reminderAt?: Date | string | null;
  reminderNote?: string | null;
}

export function ReminderButton({ jobId, reminderAt, reminderNote }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(reminderAt ? new Date(reminderAt).toISOString().slice(0, 16) : "");
  const [note, setNote] = useState(reminderNote || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/jobs/${jobId}/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ at: date || null, note }),
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    await fetch(`/api/jobs/${jobId}/reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ at: null, note: null }),
    });
    setOpen(false);
  }

  function quickPick(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(9, 0, 0, 0);
    setDate(d.toISOString().slice(0, 16));
  }

  const isActive = reminderAt && new Date(reminderAt) > new Date();

  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(!open)}
        className={`text-xs px-3 py-1.5 rounded border ${isActive ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300" : "border-graphite-200 dark:border-graphite-700 dark:text-graphite-300"}`}>
        ⏰ {isActive ? `Reminder: ${new Date(reminderAt).toLocaleDateString()}` : "Set reminder"}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 w-72 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded shadow-xl p-3 space-y-2">
          <div className="flex gap-1 flex-wrap">
            {[1, 3, 7, 14, 30].map(d => (
              <button key={d} onClick={() => quickPick(d)}
                className="text-[11px] px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300">
                {d}d
              </button>
            ))}
          </div>
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white" />
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Reminder note (optional)"
            className="w-full text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white" />
          <div className="flex gap-2 justify-end">
            {isActive && <button onClick={clear} className="text-xs text-red-500">Clear</button>}
            <button onClick={() => setOpen(false)} className="text-xs text-graphite-500">Cancel</button>
            <button onClick={save} disabled={saving || !date}
              className="text-xs px-3 py-1 rounded bg-cyan text-white font-semibold">
              {saving ? "..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
