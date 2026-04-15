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
  const progress = job.totalPhotos > 0 ? Math.round((job.processedPhotos / job.totalPhotos) * 100) : 0;

  async function handleStartProcessing(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
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
    <Wrapper className="flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors duration-150 hover:bg-graphite-50 border-b border-graphite-50 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${dotColors[job.status]}`} />
        <div>
          <div className="text-[13.5px] font-semibold text-graphite-900">{job.address}</div>
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
            <Badge variant={job.preset === "luxury" ? "luxury" : "standard"}>
              {job.preset.charAt(0).toUpperCase() + job.preset.slice(1)}
            </Badge>
          </div>
          {job.clientName && (
            <div className="text-[11px] text-graphite-500 mt-0.5">{job.clientName}</div>
          )}
          {job.tags && (
            <div className="flex gap-1 mt-1">
              {job.tags.split(",").map((t: string) => t.trim()).filter(Boolean).map((tag: string) => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan font-semibold uppercase tracking-wide">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {job.status === "processing" && (
          <div>
            <div className="text-xs font-semibold text-amber-600">Processing {job.processedPhotos}/{job.totalPhotos}</div>
            <ProgressBar value={progress} color="amber" />
          </div>
        )}
        {job.status === "review" && (
          <>
            <span className="text-xs font-semibold text-cyan">Ready for Review</span>
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
            <SaveTemplateButton jobId={job.id} />
            <DuplicateJobButton jobId={job.id} />
            <DeleteJobButton jobId={job.id} />
          </>
        )}
        {job.status === "approved" && (
          <>
            <span className="text-xs font-semibold text-emerald-600">Approved</span>
            <DownloadButton jobId={job.id} />
            <SaveTemplateButton jobId={job.id} />
            <DuplicateJobButton jobId={job.id} />
            <DeleteJobButton jobId={job.id} />
            <span className="text-graphite-300 text-base">›</span>
          </>
        )}
      </div>
    </Wrapper>
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
