"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getRecent, type RecentJob } from "@/lib/recently-viewed";

export function RecentlyViewedWidget() {
  const [items, setItems] = useState<RecentJob[]>([]);

  useEffect(() => {
    setItems(getRecent());
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="bg-white dark:bg-graphite-900 rounded-lg border border-graphite-100 dark:border-graphite-800">
      <div className="px-4 py-3 border-b border-graphite-50 dark:border-graphite-800">
        <h3 className="text-sm font-semibold text-graphite-900 dark:text-white">Recently viewed</h3>
      </div>
      <ul className="divide-y divide-graphite-50 dark:divide-graphite-800">
        {items.map(item => (
          <li key={item.id}>
            <Link href={`/review/${item.id}`}
              className="block px-4 py-2 text-xs hover:bg-graphite-50 dark:hover:bg-graphite-800 transition-colors">
              <div className="dark:text-white truncate">{item.address}</div>
              <div className="text-[10px] text-graphite-400">
                {timeAgo(item.visitedAt)}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
