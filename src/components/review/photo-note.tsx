"use client";
import { useState, useEffect, useRef } from "react";
import { SnippetPicker } from "@/components/notes/snippet-picker";

interface Props {
  jobId: string;
  photoId: string;
  initialNote: string | null | undefined;
  initialPinned?: boolean;
  onPinnedChange?: (pinned: boolean) => void;
  onNoteChange?: (note: string) => void;
}

export function PhotoNote({ jobId, photoId, initialNote, initialPinned, onPinnedChange, onNoteChange }: Props) {
  const [note, setNote] = useState(initialNote || "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pinned, setPinned] = useState<boolean>(!!initialPinned);
  const [pinBusy, setPinBusy] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef(initialNote || "");

  useEffect(() => {
    setNote(initialNote || "");
    lastSavedRef.current = initialNote || "";
    setSavedAt(null);
    setPinned(!!initialPinned);
  }, [photoId, initialNote, initialPinned]);

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
          onNoteChange?.(note);
        }
      } finally {
        setSaving(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [note, editing, jobId, photoId, onNoteChange]);

  const togglePin = async () => {
    if (pinBusy) return;
    const next = !pinned;
    setPinBusy(true);
    setPinned(next);
    try {
      const res = await fetch(`/api/photos/${photoId}/note-pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: next }),
      });
      if (!res.ok) {
        setPinned(!next);
      } else {
        onPinnedChange?.(next);
      }
    } catch {
      setPinned(!next);
    } finally {
      setPinBusy(false);
    }
  };

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
      <div className="flex items-start gap-1">
        <div
          onClick={() => setEditing(true)}
          className="text-xs px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 cursor-pointer max-w-sm"
        >
          📝 {note}
        </div>
        <button
          onClick={togglePin}
          disabled={pinBusy}
          title={pinned ? "Unpin note from photo" : "Pin note to photo as overlay"}
          className={`text-xs px-1.5 py-1 rounded border transition-colors disabled:opacity-50 ${
            pinned
              ? "bg-amber-400/20 border-amber-400 text-amber-700 dark:text-amber-300"
              : "border-graphite-200 dark:border-graphite-700 text-graphite-400 hover:text-amber-500"
          }`}
        >
          📌
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2">
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
          className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white w-64 max-w-full flex-1"
        />
        <SnippetPicker category="photo" onInsert={(text) => setNote(prev => prev ? `${prev}\n${text}` : text)} />
        <button
          onMouseDown={(e) => { e.preventDefault(); togglePin(); }}
          disabled={pinBusy}
          title={pinned ? "Unpin note from photo" : "Pin note to photo as overlay"}
          className={`text-xs px-1.5 py-1 rounded border transition-colors disabled:opacity-50 ${
            pinned
              ? "bg-amber-400/20 border-amber-400 text-amber-700 dark:text-amber-300"
              : "border-graphite-200 dark:border-graphite-700 text-graphite-400 hover:text-amber-500"
          }`}
        >
          📌
        </button>
      </div>
      <div className="text-[10px] text-graphite-400">
        {saving ? "Saving..." : savedAt ? "Saved ✓" : "Auto-saves"}
      </div>
    </div>
  );
}
