"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { BellIcon } from "@heroicons/react/24/outline";

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setItems(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch {}
  }

  useEffect(() => {
    load();
    let timer: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (timer) return;
      timer = setInterval(load, 30000);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    function onVisibility() {
      if (document.visibilityState === "visible") { load(); start(); }
      else { stop(); }
    }
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    load();
  }

  async function markOneRead(id: string) {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    load();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded hover:bg-graphite-100 dark:hover:bg-graphite-800">
        <BellIcon className="w-5 h-5 text-graphite-600 dark:text-graphite-300" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-lg shadow-xl max-h-[500px] flex flex-col">
            <div className="flex justify-between items-center px-3 py-2 border-b border-graphite-100 dark:border-graphite-800">
              <h3 className="text-sm font-semibold dark:text-white">Notifications</h3>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-cyan hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-6 text-center text-xs text-graphite-400">No notifications yet</div>
              ) : (
                <ul>
                  {items.map(n => (
                    <li key={n.id} className={`border-b border-graphite-50 dark:border-graphite-800 last:border-b-0 ${!n.readAt ? "bg-cyan-50/30 dark:bg-cyan-900/10" : ""}`}>
                      <Link
                        href={n.href || "#"}
                        onClick={() => { markOneRead(n.id); setOpen(false); }}
                        className="block p-3 hover:bg-graphite-50 dark:hover:bg-graphite-800"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-base">{iconFor(n.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium dark:text-white truncate">{n.title}</div>
                            {n.body && <div className="text-xs text-graphite-500 dark:text-graphite-400 truncate">{n.body}</div>}
                            <div className="text-[10px] text-graphite-400 mt-1">{formatTime(new Date(n.createdAt))}</div>
                          </div>
                          {!n.readAt && <div className="w-2 h-2 rounded-full bg-cyan flex-shrink-0 mt-1" />}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function iconFor(type: string): string {
  switch (type) {
    case "job-ready": return "✅";
    case "photo-failed": return "⚠";
    case "client-comment": return "💬";
    case "mention": return "💬";
    case "digest": return "📊";
    default: return "🔔";
  }
}

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
