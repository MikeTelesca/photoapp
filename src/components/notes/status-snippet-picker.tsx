"use client";
import { useState, useEffect, useRef } from "react";

type Status = "pending" | "processing" | "review" | "approved" | "rejected";

interface Props {
  status: Status | string;
  /** If provided, clicking a snippet will call this and insert the text. If omitted, copies to clipboard. */
  onInsert?: (text: string) => void;
}

export function StatusSnippetPicker({ status, onInsert }: Props) {
  const [snippets, setSnippets] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    fetch("/api/user/status-snippets")
      .then((r) => r.json())
      .then((d) => {
        const map = (d?.statusSnippets ?? {}) as Record<string, string[]>;
        const list = Array.isArray(map[status]) ? map[status] : [];
        setSnippets(list);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [open, loaded, status]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handlePick(text: string) {
    if (onInsert) {
      onInsert(text);
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setToast("Copied to clipboard");
        setTimeout(() => setToast(null), 1500);
      } catch {
        setToast("Could not copy");
        setTimeout(() => setToast(null), 1500);
      }
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`Snippets for ${status}`}
        className="text-[10px] px-2 py-0.5 rounded border border-graphite-200 dark:border-graphite-700 text-graphite-500 dark:text-graphite-400 hover:bg-graphite-50 dark:hover:bg-graphite-800"
      >
        💬 Snippets
      </button>
      {toast && (
        <span className="absolute right-0 -top-6 text-[10px] bg-graphite-900 text-white rounded px-2 py-0.5 whitespace-nowrap">
          {toast}
        </span>
      )}
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-64 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded shadow-lg max-h-60 overflow-y-auto">
          <div className="px-3 py-2 border-b border-graphite-100 dark:border-graphite-800 text-[10px] uppercase tracking-wide text-graphite-400">
            Status: {status}
          </div>
          {!loaded ? (
            <div className="p-3 text-xs text-graphite-400">Loading…</div>
          ) : snippets.length === 0 ? (
            <div className="p-3 text-xs text-graphite-400">
              No snippets for this status.{" "}
              <a href="/settings/snippets" className="text-cyan hover:underline">
                Add some →
              </a>
            </div>
          ) : (
            <ul>
              {snippets.map((snip, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => handlePick(snip)}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-graphite-50 dark:hover:bg-graphite-800"
                  >
                    <div className="text-graphite-700 dark:text-graphite-200 whitespace-pre-wrap line-clamp-3">
                      {snip}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-graphite-100 dark:border-graphite-800 p-2">
            <a href="/settings/snippets" className="text-[11px] text-cyan hover:underline">
              Manage snippets →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
