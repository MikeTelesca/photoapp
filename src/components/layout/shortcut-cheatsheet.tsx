"use client";
import { useEffect, useState } from "react";

interface Shortcut {
  keys: string[];
  action: string;
}

interface Section {
  title: string;
  shortcuts: Shortcut[];
}

const SECTIONS: Section[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: ["⌘", "N"], action: "New job" },
      { keys: ["⌘", "K"], action: "Open command palette" },
      { keys: ["?"], action: "Show this cheatsheet" },
      { keys: ["Esc"], action: "Close modal / overlay" },
    ],
  },
  {
    title: "Review gallery",
    shortcuts: [
      { keys: ["A"], action: "Approve photo" },
      { keys: ["R"], action: "Reject photo" },
      { keys: ["E"], action: "Re-enhance photo" },
      { keys: ["F"], action: "Favorite photo" },
      { keys: ["T"], action: "Flag photo for review" },
      { keys: ["S"], action: "Toggle slider view" },
      { keys: ["Z"], action: "Toggle zoom" },
      { keys: ["←", "→"], action: "Navigate photos" },
      { keys: ["Space"], action: "Pause/play slideshow" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["G", "D"], action: "Go to dashboard" },
      { keys: ["G", "N"], action: "Go to new job" },
      { keys: ["G", "S"], action: "Go to search" },
    ],
  },
  {
    title: "Notes & forms",
    shortcuts: [
      { keys: ["⌘", "/"], action: "Insert snippet (in note fields)" },
    ],
  },
];

export function ShortcutCheatsheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't trigger while typing
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if (e.key === "?") {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Listen for global custom event to open
  useEffect(() => {
    function handler() { setOpen(true); }
    window.addEventListener("open-shortcuts-cheatsheet", handler);
    return () => window.removeEventListener("open-shortcuts-cheatsheet", handler);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onClick={() => setOpen(false)}>
      <div className="bg-white dark:bg-graphite-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-graphite-100 dark:border-graphite-800 flex items-center justify-between">
          <h2 className="text-lg font-bold dark:text-white">Keyboard shortcuts</h2>
          <button onClick={() => setOpen(false)}
            className="text-graphite-400 hover:text-graphite-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-5">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wide mb-2">{section.title}</h3>
              <ul className="space-y-1">
                {section.shortcuts.map((s, i) => (
                  <li key={i} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="dark:text-graphite-300">{s.action}</span>
                    <div className="flex gap-1">
                      {s.keys.map((key, j) => (
                        <kbd key={j} className="text-xs font-mono px-2 py-0.5 bg-graphite-100 dark:bg-graphite-800 border border-graphite-200 dark:border-graphite-700 rounded dark:text-white">
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 bg-graphite-50 dark:bg-graphite-800 text-[10px] text-graphite-500 dark:text-graphite-400">
          Customize review gallery shortcuts in <a href="/settings/keyboard" className="text-cyan hover:underline">Settings → Keyboard</a>
        </div>
      </div>
    </div>
  );
}
