"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface Activity {
  id: string;
  type: string;
  message: string;
  jobAddress: string | null;
  createdAt: string;
}

const iconMap: Record<string, { Icon: any; bg: string }> = {
  job_created: { Icon: CloudArrowUpIcon, bg: "bg-cyan-50 text-cyan" },
  job_approved: { Icon: CheckCircleIcon, bg: "bg-emerald-100 text-emerald-600" },
  job_deleted: { Icon: TrashIcon, bg: "bg-red-100 text-red-600" },
  photo_enhanced: { Icon: ArrowPathIcon, bg: "bg-amber-100 text-amber-600" },
  photo_regenerated: { Icon: ArrowPathIcon, bg: "bg-amber-100 text-amber-600" },
  photo_approved: { Icon: CheckCircleIcon, bg: "bg-emerald-100 text-emerald-600" },
  photo_rejected: { Icon: ExclamationTriangleIcon, bg: "bg-red-100 text-red-600" },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return "just now";
  if (ms < 3600000) return Math.floor(ms / 60000) + " min ago";
  if (ms < 86400000) return Math.floor(ms / 3600000) + " hr ago";
  return Math.floor(ms / 86400000) + " days ago";
}

export function ActivityFeed() {
  const [items, setItems] = useState<Activity[]>([]);

  useEffect(() => {
    fetch("/api/activity?limit=10")
      .then((r) => r.json())
      .then(setItems)
      .catch(console.error);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <Button variant="text" className="text-xs">See All</Button>
      </CardHeader>
      <div className="px-5 pb-4">
        {items.length === 0 && (
          <div className="text-xs text-graphite-400 py-4 text-center">No activity yet</div>
        )}
        {items.map((item) => {
          const { Icon, bg } = iconMap[item.type] || {
            Icon: CloudArrowUpIcon,
            bg: "bg-graphite-100 text-graphite-700",
          };
          return (
            <div
              key={item.id}
              className="flex items-center gap-2.5 py-2.5 border-b border-graphite-50 last:border-b-0"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[12.5px] text-graphite-700">
                  {item.jobAddress && (
                    <strong className="font-semibold text-graphite-900">{item.jobAddress}</strong>
                  )}
                  {item.jobAddress && " — "}
                  {item.message}
                </div>
                <div className="text-[11px] text-graphite-300 mt-0.5">{timeAgo(item.createdAt)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
