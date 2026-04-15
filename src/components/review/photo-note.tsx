"use client";
import { useState, useEffect, useRef } from "react";

interface Props {
  jobId: string;
  photoId: string;
  initialNote: string | null | undefined;
}

export function PhotoNote({ jobId, photoId, initialNote }: Props) {
  const [note, setNote] = useState(initialNote || "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef(initialNote || "");

  useEffect(() => {
    setNote(initialNote || "");
    lastSavedRef.current = initialNote || "";
    setSavedAt(null);
  }, [photoId, initialNote]);

  // Auto-save with debounce
  useEffect(() => {
    if (!editing) return;
    if (note === lastSavedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaving(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/photos/${photoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: note.trim() }),
        });
        if (res.ok) {
          lastSavedRef.current = note;
          setSavedAt(Date.now());
        }
      } finally {
        setSaving(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [note, editing, jobId, photoId]);

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
        onBlur={() => {
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setNote(lastSavedRef.current);
            setEditing(false);
          }
        }}
        placeholder="Photo note (auto-saves)"
        rows={2}
        className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white w-64 max-w-full"
      />
      <div className="text-[10px] text-graphite-400">
        {saving ? "Saving..." : savedAt ? "Saved ✓" : "Auto-saves"}
      </div>
    </div>
  );
}
