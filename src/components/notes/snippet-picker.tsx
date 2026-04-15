"use client";
import { useState, useEffect, useRef } from "react";

interface Template { id: string; title: string; body: string; category: string; }

interface Props {
  category?: "job" | "photo";
  onInsert: (text: string) => void;
}

export function SnippetPicker({ category, onInsert }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/note-templates${category ? `?category=${category}` : ""}`)
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []))
      .catch(() => {});
  }, [open, category]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className="text-[10px] px-2 py-0.5 rounded border border-graphite-200 dark:border-graphite-700 text-graphite-500 dark:text-graphite-400 hover:bg-graphite-50 dark:hover:bg-graphite-800">
        💬 Snippets
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-64 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded shadow-lg max-h-60 overflow-y-auto">
          {templates.length === 0 ? (
            <div className="p-3 text-xs text-graphite-400">
              No snippets yet. <a href="/settings/snippets" className="text-cyan hover:underline">Create some →</a>
            </div>
          ) : (
            <ul>
              {templates.map(t => (
                <li key={t.id}>
                  <button type="button"
                    onClick={() => { onInsert(t.body); setOpen(false); }}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-graphite-50 dark:hover:bg-graphite-800">
                    <div className="font-semibold dark:text-white">{t.title}</div>
                    <div className="text-graphite-500 truncate">{t.body.slice(0, 60)}{t.body.length > 60 ? "..." : ""}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-graphite-100 dark:border-graphite-800 p-2">
            <a href="/settings/snippets" className="text-[11px] text-cyan hover:underline">Manage snippets →</a>
          </div>
        </div>
      )}
    </div>
  );
}
