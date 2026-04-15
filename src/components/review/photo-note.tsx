"use client";
import { useState, useEffect } from "react";

interface Props {
  jobId: string;
  photoId: string;
  initialNote: string | null | undefined;
}

export function PhotoNote({ jobId, photoId, initialNote }: Props) {
  const [note, setNote] = useState(initialNote || "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setNote(initialNote || "");
  }, [photoId, initialNote]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() }),
      });
      if (res.ok) {
        setEditing(false);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!editing && !note) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-[10px] text-graphite-400 hover:text-cyan underline"
      >
        + add note
      </button>
    );
  }

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className="text-xs px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 cursor-pointer max-w-sm"
      >
        📝 {note}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <textarea
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setNote(initialNote || "");
            setEditing(false);
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
        }}
        placeholder="Photo note (⌘+Enter to save, Esc to cancel)"
        rows={2}
        className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white w-64 max-w-full"
      />
      <div className="flex gap-1">
        <button onClick={save} disabled={saving}
          className="text-[10px] px-2 py-0.5 rounded bg-cyan text-white font-semibold">
          {saving ? "Saving..." : justSaved ? "Saved ✓" : "Save"}
        </button>
        <button onClick={() => { setNote(initialNote || ""); setEditing(false); }}
          className="text-[10px] px-2 py-0.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300">
          Cancel
        </button>
      </div>
    </div>
  );
}
