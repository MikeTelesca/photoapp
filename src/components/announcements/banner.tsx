"use client";
import { useEffect, useState } from "react";

interface Announcement { id: string; message: string; type: string; createdAt: string; }

const colors: Record<string, string> = {
  info: "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-200",
  warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
  success: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200",
};

const icons: Record<string, string> = {
  info: "ℹ",
  warning: "⚠",
  success: "✓",
};

export function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem("announcements-dismissed");
    if (dismissed) {
      try { setDismissedIds(new Set(JSON.parse(dismissed))); } catch {}
    }
    fetch("/api/announcements").then(r => r.json()).then(d => {
      setAnnouncements(d.announcements || []);
    }).catch(() => {});
  }, []);

  function dismiss(id: string) {
    const updated = new Set(dismissedIds);
    updated.add(id);
    setDismissedIds(updated);
    localStorage.setItem("announcements-dismissed", JSON.stringify([...updated]));
  }

  const visible = announcements.filter(a => !dismissedIds.has(a.id));
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map(a => (
        <div key={a.id}
          className={`flex items-center justify-between gap-3 px-4 py-2 border-b text-xs ${colors[a.type] || colors.info}`}>
          <span>
            <strong className="mr-2">{icons[a.type] || icons.info}</strong>
            {a.message}
          </span>
          <button onClick={() => dismiss(a.id)} className="text-base leading-none opacity-70 hover:opacity-100">×</button>
        </div>
      ))}
    </>
  );
}
