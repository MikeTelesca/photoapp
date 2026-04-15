"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/dashboard/download-button";
import { DeleteJobButton } from "@/components/dashboard/delete-job-button";
import { DuplicateJobButton } from "@/components/dashboard/duplicate-job-button";
import { SaveTemplateButton } from "@/components/dashboard/save-template-button";
import { EditTagsButton } from "@/components/dashboard/edit-tags-button";
import { ArchiveButton } from "@/components/dashboard/archive-button";
import { EtaBadge } from "@/components/dashboard/eta-badge";
import { PinButton } from "@/components/dashboard/pin-button";
import { SnoozeButton } from "@/components/dashboard/snooze-button";
import { InvoicePreviewModal } from "@/components/billing/invoice-preview-modal";
import { formatJobNumber } from "@/lib/job-number";
import { tagColor } from "@/lib/tag-color";
import { checkStale } from "@/lib/job-stale";
import type { Job } from "@/lib/types";

interface JobCardProps {
  job: Job;
}

const dotColors: Record<string, string> = {
  pending: "bg-graphite-400",
  processing: "bg-amber-500",
  review: "bg-cyan",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
};

function JobCardInternal({ job }: JobCardProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const progress = job.totalPhotos > 0 ? Math.round((job.processedPhotos / job.totalPhotos) * 100) : 0;

  async function handleStartProcessing(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Fetch estimate first
    try {
      const estRes = await fetch(`/api/jobs/${job.id}/estimate`);
      const est = await estRes.json();
      if (est.overBudget) {
        const confirmed = confirm(
          `This job has ${est.photoCount} photos and will cost approximately $${est.estimatedCost.toFixed(2)}.\n\n` +
          `That's above your per-job budget of $${est.budgetPerJob.toFixed(2)}.\n\n` +
          `Continue with processing?`
        );
        if (!confirmed) return;
      }
    } catch (err) {
      console.error("estimate err:", err);
    }

    setIsStarting(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/ingest`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to start processing");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsStarting(false);
      window.location.reload();
    }
  }

  const isLinkable = job.status === "review" || job.status === "approved" || job.status === "processing";

  const Wrapper = isLinkable
    ? ({ children, className }: { children: React.ReactNode; className: string }) => (
        <Link href={`/review/${job.id}`} className={className}>{children}</Link>
      )
    : ({ children, className }: { children: React.ReactNode; className: string }) => (
        <div className={className}>{children}</div>
      );

  return (
    <>
      <Wrapper className="flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors duration-150 hover:bg-graphite-50 dark:hover:bg-graphite-800 border-b border-graphite-50 dark:border-graphite-800 last:border-b-0">
        <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${dotColors[job.status]}`} />
        <div>
          <div className="flex gap-1 items-center mb-0.5">
            {job.sequenceNumber && (
              <span className="text-[9px] font-mono font-semibold text-cyan dark:text-cyan">
                {formatJobNumber({ sequence: job.sequenceNumber, createdAt: job.createdAt })}
              </span>
            )}
            {job.pinnedAt && (
              <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 font-semibold">📌 Pinned</span>
            )}
            {job.priority === "high" && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold uppercase tracking-wide">
                🔴 High
              </span>
            )}
            {job.priority === "low" && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-graphite-100 dark:bg-graphite-800 text-graphite-500 dark:text-graphite-400 uppercase tracking-wide">
                Low
              </span>
            )}
            {(() => {
              const stale = checkStale({ status: job.status, createdAt: job.createdAt, updatedAt: job.updatedAt });
              if (!stale.isStale) return null;
              return (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wide" title={stale.reason}>
                  ⚠ Stale
                </span>
              );
            })()}
          </div>
          <div className="text-[13.5px] font-semibold text-graphite-900 dark:text-white">{job.address}</div>
          <div className="flex gap-3 text-xs text-graphite-400 mt-0.5">
            <span>{job.photographerName}</span>
            <span>{formatTime(job.createdAt)}</span>
            <span>
              {job.totalPhotos} photos{job.twilightCount > 0 ? ` · ${job.twilightCount} twilight` : ""}
              {job.approvedPhotos > 0 && (
                <span className="ml-1 text-emerald-600 font-semibold">· {job.approvedPhotos} ✓</span>
              )}
              {job.rejectedPhotos > 0 && (
                <span className="ml-1 text-red-600 font-semibold">· {job.rejectedPhotos} ✗</span>
              )}
            </span>
            {job.cost > 0 && <span>${job.cost.toFixed(2)}</span>}
            {job.trackedTimeSeconds && job.trackedTimeSeconds > 0 && (
              <span className="text-[10px] text-graphite-500 dark:text-graphite-400">
                ⏱ {Math.round(job.trackedTimeSeconds / 60)}m
              </span>
            )}
            <Badge variant={job.preset === "luxury" ? "luxury" : "standard"}>
              {job.preset.charAt(0).toUpperCase() + job.preset.slice(1)}
            </Badge>
          </div>
          {job.clientName && (
            <div className="text-[11px] text-graphite-500 dark:text-graphite-400 mt-0.5">{job.clientName}</div>
          )}
          {job.tags && (
            <div className="flex gap-1 mt-1 items-center">
              {job.tags.split(",").map((t: string) => t.trim()).filter(Boolean).map((tag: string) => {
                const c = tagColor(tag);
                return (
                  <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${c.bg} ${c.text}`}>
                    {tag}
                  </span>
                );
              })}
              <EditTagsButton jobId={job.id} initial={job.tags || ""} />
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {job.status === "processing" && (
          <div>
            <div className="text-xs font-semibold text-amber-600">Processing {job.processedPhotos}/{job.totalPhotos}</div>
            <ProgressBar value={progress} color="amber" />
            <EtaBadge jobId={job.id} />
          </div>
        )}
        {job.status === "review" && (
          <>
            <span className="text-xs font-semibold text-cyan">Ready for Review</span>
            <SnoozeButton jobId={job.id} snoozedUntil={job.snoozedUntil} />
            <PinButton jobId={job.id} pinned={!!job.pinnedAt} />
            <SaveTemplateButton jobId={job.id} />
            <DuplicateJobButton jobId={job.id} />
            <DeleteJobButton jobId={job.id} />
            <span className="text-graphite-300 text-base">›</span>
          </>
        )}
        {job.status === "pending" && (
          <>
            <Button
              variant="outline"
              className="text-xs"
              onClick={handleStartProcessing}
              disabled={isStarting}
            >
              {isStarting ? "Starting..." : "Start Processing"}
            </Button>
            <SnoozeButton jobId={job.id} snoozedUntil={job.snoozedUntil} />
            <PinButton jobId={job.id} pinned={!!job.pinnedAt} />
            <SaveTemplateButton jobId={job.id} />
            <DuplicateJobButton jobId={job.id} />
            <DeleteJobButton jobId={job.id} />
          </>
        )}
        {job.status === "approved" && (
          <>
            <span className="text-xs font-semibold text-emerald-600">Approved</span>
            <DownloadButton jobId={job.id} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setPreviewOpen(true);
              }}
              className="text-xs px-2 py-1 rounded border border-graphite-200 hover:bg-graphite-50 dark:border-graphite-700 dark:hover:bg-graphite-800"
            >
              Invoice
            </button>
            <a
              href={`/api/jobs/${job.id}/pdf-gallery`}
              download
              className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800"
              onClick={(e) => e.stopPropagation()}
            >
              PDF
            </a>
            <ArchiveButton jobId={job.id} archived={!!job.archivedAt} />
            <SnoozeButton jobId={job.id} snoozedUntil={job.snoozedUntil} />
            <PinButton jobId={job.id} pinned={!!job.pinnedAt} />
            <SaveTemplateButton jobId={job.id} />
            <DuplicateJobButton jobId={job.id} />
            <DeleteJobButton jobId={job.id} />
            <span className="text-graphite-300 text-base">›</span>
          </>
        )}
      </div>
    </Wrapper>
    <InvoicePreviewModal jobId={job.id} open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  return "Yesterday";
}

export const JobCard = memo(JobCardInternal);
