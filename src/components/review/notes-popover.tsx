"use client";

import { useState, useRef, useEffect } from "react";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SnippetPicker } from "@/components/notes/snippet-picker";
import { StatusSnippetPicker } from "@/components/notes/status-snippet-picker";

export function NotesPopover({
  jobId,
  initialNotes,
  jobStatus,
}: {
  jobId: string;
  initialNotes: string | null;
  jobStatus?: string;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
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
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-xl shadow-xl p-3 z-30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-graphite-700 dark:text-graphite-200">Job Notes</span>
            <span className="text-[10px] text-graphite-400">
              {saving ? "Saving..." : savedAt ? "Saved" : "Auto-saves"}
            </span>
          </div>
          <div className="flex items-center gap-1 mb-2 border-b border-graphite-200 dark:border-graphite-700">
            <button
              type="button"
              onClick={() => setTab("edit")}
              className={`px-3 py-1.5 text-[11px] font-semibold border-b-2 -mb-px transition-colors ${
                tab === "edit"
                  ? "border-cyan text-cyan"
                  : "border-transparent text-graphite-500 hover:text-graphite-700 dark:hover:text-graphite-200"
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={`px-3 py-1.5 text-[11px] font-semibold border-b-2 -mb-px transition-colors ${
                tab === "preview"
                  ? "border-cyan text-cyan"
                  : "border-transparent text-graphite-500 hover:text-graphite-700 dark:hover:text-graphite-200"
              }`}
            >
              Preview
            </button>
          </div>
          {tab === "edit" ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder="Add notes about this job - special instructions, client preferences, etc."
                className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-xs focus:outline-none focus:border-cyan resize-none bg-transparent"
              />
              <div className="text-[10px] text-graphite-400 font-mono leading-relaxed">
                **bold** *italic* [link](url) `code` - bullets # heading
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <SnippetPicker category="job" onInsert={(text) => setNotes(prev => prev ? `${prev}\n${text}` : text)} />
                {jobStatus && (
                  <StatusSnippetPicker status={jobStatus} onInsert={(text) => setNotes(prev => prev ? `${prev}\n${text}` : text)} />
                )}
              </div>
            </div>
          ) : (
            <div className="min-h-[8rem] px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700">
              {hasNotes ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-xs text-graphite-400 italic">Nothing to preview yet.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
