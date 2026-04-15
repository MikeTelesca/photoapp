"use client";
import { useEffect, useState } from "react";
import type { Job } from "@/lib/types";

interface Props {
  job: Job;
  visible: boolean;
  x: number;
  y: number;
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  review: "Ready for Review",
  approved: "Approved",
  rejected: "Rejected",
  deleted: "Deleted",
};

const statusColors: Record<string, string> = {
  pending: "text-graphite-300",
  processing: "text-amber-400",
  review: "text-cyan",
  approved: "text-emerald-400",
  rejected: "text-red-400",
  deleted: "text-graphite-400",
};

const statusDotColors: Record<string, string> = {
  pending: "bg-graphite-400",
  processing: "bg-amber-500",
  review: "bg-cyan",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
  deleted: "bg-graphite-500",
};

function formatRelative(date: Date | string | undefined): string {
  if (!date) return "unknown";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString();
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `~${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `~${hours}h ${remMins}m`;
}

export function StatusHoverCard({ job, visible, x, y }: Props) {
  const [eta, setEta] = useState<{ etaSeconds: number; remaining: number } | null>(null);

  useEffect(() => {
    if (!visible || job.status !== "processing") return;
    let cancelled = false;
    fetch(`/api/jobs/${job.id}/eta`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setEta(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, job.id, job.status]);

  if (!visible) return null;

  const w = 260;
  const h = 180;
  let left = x + 16;
  let top = y - 20;
  if (typeof window !== "undefined") {
    if (left + w > window.innerWidth) left = x - w - 16;
    if (top < 0) top = 16;
    if (top + h > window.innerHeight) top = window.innerHeight - h - 16;
  }

  const label = statusLabels[job.status] || job.status;
  const colorCls = statusColors[job.status] || "text-white";
  const dotCls = statusDotColors[job.status] || "bg-graphite-400";
  const awaiting = Math.max(
    0,
    (job.processedPhotos || 0) - (job.approvedPhotos || 0) - (job.rejectedPhotos || 0)
  );

  return (
    <div
      className="fixed z-50 pointer-events-none rounded-lg shadow-2xl bg-graphite-900 text-white text-xs p-3 border border-graphite-700"
      style={{ left, top, width: w }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${dotCls}`} />
        <span className={`font-semibold uppercase tracking-wide ${colorCls}`}>{label}</span>
      </div>

      <div className="text-[10px] text-graphite-400 mb-2">
        Last updated {formatRelative(job.updatedAt)}
      </div>

      {job.status === "processing" && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-graphite-400">Progress</span>
            <span className="font-semibold">
              {job.processedPhotos}/{job.totalPhotos}
            </span>
          </div>
          {eta && eta.remaining > 0 && (
            <div className="flex justify-between">
              <span className="text-graphite-400">ETA</span>
              <span className="font-semibold text-amber-400">{formatEta(eta.etaSeconds)}</span>
            </div>
          )}
          {eta && eta.remaining > 0 && (
            <div className="flex justify-between">
              <span className="text-graphite-400">Remaining</span>
              <span className="font-semibold">{eta.remaining} photos</span>
            </div>
          )}
        </div>
      )}

      {job.status === "review" && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-graphite-400">Awaiting review</span>
            <span className="font-semibold text-cyan">{awaiting}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-graphite-400">Approved</span>
            <span className="font-semibold text-emerald-400">{job.approvedPhotos || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-graphite-400">Rejected</span>
            <span className="font-semibold text-red-400">{job.rejectedPhotos || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-graphite-400">Total</span>
            <span className="font-semibold">{job.totalPhotos}</span>
          </div>
        </div>
      )}

      {job.status === "approved" && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-graphite-400">Photos delivered</span>
            <span className="font-semibold text-emerald-400">{job.approvedPhotos || job.totalPhotos}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-graphite-400">Rejected</span>
            <span className="font-semibold">{job.rejectedPhotos || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-graphite-400">Approved on</span>
            <span className="font-semibold">{formatDate(job.updatedAt)}</span>
          </div>
          {job.clientApprovedAt && (
            <div className="flex justify-between">
              <span className="text-graphite-400">Client approved</span>
              <span className="font-semibold">{formatDate(job.clientApprovedAt)}</span>
            </div>
          )}
        </div>
      )}

      {job.status === "pending" && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-graphite-400">Photos queued</span>
            <span className="font-semibold">{job.totalPhotos}</span>
          </div>
          <div className="text-[10px] text-graphite-400 pt-1">
            Waiting to start processing.
          </div>
        </div>
      )}

      {job.status === "rejected" && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-graphite-400">Rejected photos</span>
            <span className="font-semibold text-red-400">{job.rejectedPhotos || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-graphite-400">Total</span>
            <span className="font-semibold">{job.totalPhotos}</span>
          </div>
        </div>
      )}
    </div>
  );
}
