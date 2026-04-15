"use client";

import { useState, useRef, useEffect } from "react";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";

export function NotesPopover({ jobId, initialNotes }: { jobId: string; initialNotes: string | null }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  // Auto-save with debounce
  useEffect(() => {
    if (notes === (initialNotes || "")) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/jobs/${jobId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        });
        setSavedAt(Date.now());
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [notes, jobId, initialNotes]);

  const hasNotes = (notes || "").trim().length > 0;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
          hasNotes
            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
            : "bg-graphite-100 text-graphite-700 hover:bg-graphite-200"
        }`}
        title={hasNotes ? "Job has notes" : "Add notes"}
      >
        <ChatBubbleLeftIcon className="w-4 h-4" />
        Notes{hasNotes && " \u25CF"}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-graphite-200 rounded-xl shadow-xl p-3 z-30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-graphite-700">Job Notes</span>
            <span className="text-[10px] text-graphite-400">
              {saving ? "Saving..." : savedAt ? "Saved" : "Auto-saves"}
            </span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder="Add notes about this job - special instructions, client preferences, etc."
            className="w-full px-3 py-2 rounded-lg border border-graphite-200 text-xs focus:outline-none focus:border-cyan resize-none"
          />
        </div>
      )}
    </div>
  );
}
