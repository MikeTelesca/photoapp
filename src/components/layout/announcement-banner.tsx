"use client";
import { useEffect, useState } from "react";

interface Announcement {
  id: string;
  message: string;
  level?: string;
  type?: string;
  createdAt: string;
  expiresAt?: string | null;
}

// Level-based color palette: info=cyan, warning=amber, critical=red
const levelStyles: Record<string, string> = {
  info: "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-200",
  warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
  critical: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
  // legacy aliases
  success: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200",
};

const levelIcons: Record<string, string> = {
  info: "ℹ",
  warning: "⚠",
  critical: "⛔",
  success: "✓",
};

function dismissKey(id: string) {
  return `ath-dismissed-ann-${id}`;
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/announcements/active")
      .then((r) => (r.ok ? r.json() : { announcements: [] }))
      .then((d) => {
        if (cancelled) return;
        const list: Announcement[] = d.announcements || [];
        setAnnouncements(list);
        if (typeof window !== "undefined") {
          const map: Record<string, boolean> = {};
          for (const a of list) {
            if (localStorage.getItem(dismissKey(a.id)) === "1") map[a.id] = true;
          }
          setDismissed(map);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss(id: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem(dismissKey(id), "1");
    }
    setDismissed((prev) => ({ ...prev, [id]: true }));
  }

  const visible = announcements.filter((a) => !dismissed[a.id]);
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((a) => {
        const key = (a.level || a.type || "info").toLowerCase();
        const style = levelStyles[key] || levelStyles.info;
        const icon = levelIcons[key] || levelIcons.info;
        return (
          <div
            key={a.id}
            className={`flex items-center justify-between gap-3 px-4 py-2 border-b text-xs ${style}`}
            role={key === "critical" ? "alert" : "status"}
          >
            <span>
              <strong className="mr-2">{icon}</strong>
              {a.message}
            </span>
            <button
              onClick={() => dismiss(a.id)}
              aria-label="Dismiss announcement"
              className="text-base leading-none opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        );
      })}
    </>
  );
}
