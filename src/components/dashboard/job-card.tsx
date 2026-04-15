"use client";

import { useState, memo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/dashboard/download-button";
import { DeleteJobButton } from "@/components/dashboard/delete-job-button";
import { DuplicateJobButton } from "@/components/dashboard/duplicate-job-button";
import { SaveTemplateButton } from "@/components/dashboard/save-template-button";
import { EditTagsButton } from "@/components/dashboard/edit-tags-button";
import { EditAddressButton } from "@/components/dashboard/edit-address-button";
import { ArchiveButton } from "@/components/dashboard/archive-button";
import { EtaBadge } from "@/components/dashboard/eta-badge";
import { PinButton } from "@/components/dashboard/pin-button";
import { SnoozeButton } from "@/components/dashboard/snooze-button";
import { CopyJobLinkButton } from "@/components/dashboard/copy-job-link-button";
import { InlinePresetSwitch } from "@/components/dashboard/inline-preset-switch";
import { InvoicePreviewModal } from "@/components/billing/invoice-preview-modal";
import { ColorLabelPicker } from "@/components/dashboard/color-label-picker";
import { JobHoverPreview } from "@/components/dashboard/job-hover-preview";
import { StatusHoverCard } from "@/components/dashboard/status-hover-card";
import { LockButton } from "@/components/dashboard/lock-button";
import { WatchButton } from "@/components/dashboard/watch-button";
import { formatJobNumber } from "@/lib/job-number";
import { tagColor } from "@/lib/tag-color";
import { checkStale } from "@/lib/job-stale";
import type { Job } from "@/lib/types";

interface JobCardProps {
  job: Job;
  density?: "compact" | "normal" | "comfortable";
}

const dotColors: Record<string, string> = {
  pending: "bg-graphite-400",
  processing: "bg-amber-500",
  review: "bg-cyan",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
};

function renderNotePreview(notes: string) {
  const truncated = notes.length > 60 ? notes.slice(0, 60) + "…" : notes;
  if (/(^|\s)-\s/.test(notes)) {
    const items = notes
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "))
      .map((l) => l.slice(2).trim())
      .filter(Boolean);
    if (items.length > 0) {
      return (
        <ul className="list-disc list-inside text-[11px] italic text-graphite-500 dark:text-graphite-400 mt-0.5">
          {items.slice(0, 3).map((item, i) => (
            <li key={i}>{item.length > 60 ? item.slice(0, 60) + "…" : item}</li>
          ))}
        </ul>
      );
    }
  }
  return (
    <div className="text-[11px] italic text-graphite-500 dark:text-graphite-400 mt-0.5">
      {truncated}
    </div>
  );
}

function JobCardInternal({ job, density = "normal" }: JobCardProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [isStarting, setIsStarting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [statusHover, setStatusHover] = useState<{ x: number; y: number } | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesValue, setNotesValue] = useState<string>(job.internalNotes || "");
  const [notesSaved, setNotesSaved] = useState<string>(job.internalNotes || "");
  const [notesSaving, setNotesSaving] = useState(false);

  async function saveNotes() {
    if (notesValue === notesSaved) {
      setNotesOpen(false);
      return;
    }
    setNotesSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesValue }),
      });
      if (res.ok) {
        setNotesSaved(notesValue);
      }
    } catch (err) {
      console.error("save notes err:", err);
    } finally {
      setNotesSaving(false);
      setNotesOpen(false);
    }
  }

  const statusHoverHandlers = {
    onMouseEnter: (e: React.MouseEvent) => {
      e.stopPropagation();
      setStatusHover({ x: e.clientX, y: e.clientY });
    },
    onMouseMove: (e: React.MouseEvent) => {
      if (statusHover) setStatusHover({ x: e.clientX, y: e.clientY });
    },
    onMouseLeave: () => setStatusHover(null),
  };
  const canPreview = ["processing", "review", "approved"].includes(job.status);
  const progress = job.totalPhotos > 0 ? Math.round((job.processedPhotos / job.totalPhotos) * 100) : 0;
  const padding = density === "compact" ? "px-5 py-2" : density === "comfortable" ? "px-5 py-5" : "px-5 py-3.5";

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

  const borderColor = (() => {
    switch (job.colorLabel) {
      case "red": return "border-l-4 border-l-red-500";
      case "amber": return "border-l-4 border-l-amber-500";
      case "emerald": return "border-l-4 border-l-emerald-500";
      case "blue": return "border-l-4 border-l-blue-500";
      case "purple": return "border-l-4 border-l-purple-500";
      case "pink": return "border-l-4 border-l-pink-500";
      default: return "";
    }
  })();

  const Wrapper = isLinkable
    ? ({ children, className }: { children: React.ReactNode; className: string }) => (
        <Link href={`/review/${job.id}`} className={className}>{children}</Link>
      )
    : ({ children, className }: { children: React.ReactNode; className: string }) => (
        <div className={className}>{children}</div>
      );

  return (
    <>
      <Wrapper className={`flex items-center justify-between ${padding} cursor-pointer transition-colors duration-150 hover:bg-graphite-50 dark:hover:bg-graphite-800 border-b border-graphite-50 dark:border-graphite-800 last:border-b-0 ${borderColor}`}>
        <div className="flex items-center gap-3">
        {job.coverPhotoUrl ? (
          <img src={job.coverPhotoUrl} alt=""
            className="w-10 h-10 object-cover rounded shadow-sm flex-shrink-0" />
        ) : (
          <div {...statusHoverHandlers} className={`w-2 h-2 rounded-full ${dotColors[job.status]}`} />
        )}
        <div>
          <div className="flex gap-1 items-center mb-0.5">
            {job.sequenceNumber && (
              <span className="text-[9px] font-mono font-semibold text-cyan dark:text-cyan">
                {formatJobNumber({ sequence: job.sequenceNumber, createdAt: job.createdAt })}
              </span>
            )}
            {job.pinnedAt && (
              <span className="text-[10px] uppercase tracking-wide font-medium text-graphite-600 dark:text-graphite-300">Pinned</span>
            )}
            {job.priority === "high" && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 font-medium uppercase tracking-wide">
                High
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
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-medium uppercase tracking-wide" title={stale.reason}>
                  Stale
                </span>
              );
            })()}
          </div>
          <div
            /* hover preview disabled — was getting stuck open + causing freezes */
            onMouseLeave={() => setHover(null)}
          >
            <div className="text-[13.5px] font-semibold text-graphite-900 dark:text-white inline-flex items-center">
              {job.address}
              <EditAddressButton jobId={job.id} initial={job.address} />
            </div>
          </div>
          <div className="flex gap-3 text-xs text-graphite-400 mt-0.5">
            <span>{job.photographerName}</span>
            <span>{formatTime(job.createdAt)}</span>
            <span>
              {job.totalPhotos} photos{job.twilightCount > 0 ? ` · ${job.twilightCount} twilight` : ""}
              {job.approvedPhotos > 0 && (
                <span className="ml-1 text-emerald-600 dark:text-emerald-400">· {job.approvedPhotos} approved</span>
              )}
              {job.rejectedPhotos > 0 && (
                <span className="ml-1 text-red-600 dark:text-red-400">· {job.rejectedPhotos} rejected</span>
              )}
            </span>
            {job.cost > 0 && <span>${job.cost.toFixed(2)}</span>}
            {job.trackedTimeSeconds && job.trackedTimeSeconds > 0 && (
              <span className="text-[10px] text-graphite-500 dark:text-graphite-400">
                {Math.round(job.trackedTimeSeconds / 60)}m tracked
              </span>
            )}
            {job.status === "pending" ? (
              <InlinePresetSwitch jobId={job.id} current={job.preset} />
            ) : (
              <Badge variant={job.preset === "luxury" ? "luxury" : "standard"}>
                {job.preset.charAt(0).toUpperCase() + job.preset.slice(1)}
              </Badge>
            )}
          </div>
          {job.clientName && (
            <div className="text-[11px] text-graphite-500 dark:text-graphite-400 mt-0.5 flex items-center gap-2">
              <span>{job.clientName}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNotesOpen((v) => !v);
                }}
                className="text-[10px] uppercase tracking-wide text-graphite-400 hover:text-graphite-600 dark:hover:text-graphite-200"
                title={notesSaved ? "Edit notes" : "Add notes"}
                aria-label="Edit job notes"
              >
                {notesSaved ? "Edit notes" : "+ Notes"}
              </button>
            </div>
          )}
          {!job.clientName && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setNotesOpen((v) => !v);
              }}
              className="text-[10px] uppercase tracking-wide text-graphite-400 hover:text-graphite-600 dark:hover:text-graphite-200 mt-0.5"
              title={notesSaved ? "Edit notes" : "Add notes"}
              aria-label="Edit job notes"
            >
              {notesSaved ? "Edit notes" : "+ Notes"}
            </button>
          )}
          {notesSaved && !notesOpen && renderNotePreview(notesSaved)}
          {notesOpen && (
            <div
              className="mt-1 relative"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <textarea
                autoFocus
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                onBlur={saveNotes}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveNotes();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setNotesValue(notesSaved);
                    setNotesOpen(false);
                  }
                }}
                placeholder="Quick notes… (Enter to save, Shift+Enter for newline, '- ' for list)"
                className="w-80 max-w-full text-[12px] p-2 rounded border border-graphite-300 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-900 dark:text-graphite-100 focus:outline-none focus:ring-1 focus:ring-cyan"
                rows={4}
              />
              {notesSaving && (
                <div className="text-[10px] text-graphite-400 mt-0.5">Saving…</div>
              )}
            </div>
          )}
          {job.clientApprovalStatus === "approved" && (
            <div className="mt-1">
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wide"
                title={job.clientApprovalNote || undefined}
              >
                Client Approved
              </span>
              {job.clientApprovalNote && (
                <div className="mt-1 text-[10px] text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 border-l-2 border-emerald-400 px-2 py-1 rounded max-w-md whitespace-pre-wrap">
                  “{job.clientApprovalNote}”
                </div>
              )}
            </div>
          )}
          {job.clientApprovalStatus === "changes_requested" && (
            <div className="mt-1">
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wide"
                title={job.clientApprovalNote || undefined}
              >
                Changes Requested
              </span>
              {job.clientApprovalNote && (
                <div className="mt-1 text-[10px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-400 px-2 py-1 rounded max-w-md whitespace-pre-wrap">
                  “{job.clientApprovalNote}”
                </div>
              )}
            </div>
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
          <div {...statusHoverHandlers}>
            <div className="text-xs font-semibold text-amber-600">Processing {job.processedPhotos}/{job.totalPhotos}</div>
            <ProgressBar value={progress} color="amber" />
            <EtaBadge jobId={job.id} />
          </div>
        )}
        {job.status === "review" && (
          <>
            <span {...statusHoverHandlers} className="text-xs font-semibold text-cyan">Ready for Review</span>
            <ColorLabelPicker jobId={job.id} current={job.colorLabel} />
            <CopyJobLinkButton jobId={job.id} />
            <SnoozeButton jobId={job.id} snoozedUntil={job.snoozedUntil} />
            <PinButton jobId={job.id} pinned={!!job.pinnedAt} />
            {isAdmin && <WatchButton jobId={job.id} />}
            <SaveTemplateButton jobId={job.id} />
            <DuplicateJobButton jobId={job.id} />
            <DeleteJobButton jobId={job.id} />
            <span className="text-graphite-300 dark:text-graphite-600 text-base">›</span>
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
            <ColorLabelPicker jobId={job.id} current={job.colorLabel} />
            <SnoozeButton jobId={job.id} snoozedUntil={job.snoozedUntil} />
            <PinButton jobId={job.id} pinned={!!job.pinnedAt} />
            {isAdmin && <WatchButton jobId={job.id} />}
            <SaveTemplateButton jobId={job.id} />
            <DuplicateJobButton jobId={job.id} />
            <DeleteJobButton jobId={job.id} />
          </>
        )}
        {job.status === "approved" && (
          <>
            <span {...statusHoverHandlers} className="text-xs font-semibold text-emerald-600">Approved</span>
            {job.lockedAt && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-graphite-100 dark:bg-graphite-800 text-graphite-600 dark:text-graphite-300 font-medium uppercase tracking-wide">
                Locked
              </span>
            )}
            <LockButton jobId={job.id} locked={!!job.lockedAt} />
            <ColorLabelPicker jobId={job.id} current={job.colorLabel} />
            <CopyJobLinkButton jobId={job.id} />
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
            {isAdmin && <WatchButton jobId={job.id} />}
            <SaveTemplateButton jobId={job.id} />
            <DuplicateJobButton jobId={job.id} />
            <DeleteJobButton jobId={job.id} />
            <span className="text-graphite-300 dark:text-graphite-600 text-base">›</span>
          </>
        )}
      </div>
    </Wrapper>
    {hover && canPreview && (
      <JobHoverPreview jobId={job.id} visible={true} x={hover.x} y={hover.y} />
    )}
    {statusHover && (
      <StatusHoverCard job={job} visible={true} x={statusHover.x} y={statusHover.y} />
    )}
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
