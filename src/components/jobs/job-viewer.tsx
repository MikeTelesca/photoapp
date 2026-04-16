"use client";

import { useState } from "react";
import { BeforeAfterSlider } from "@/components/ui/before-after-slider";
import type { PhotoRow } from "@/components/jobs/job-grid";

type Props = {
  jobId: string;
  photo: PhotoRow;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEnhance: () => void;
  onApprove: () => void;
  onReject: () => void;
};

const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
  pending: { label: "Pending", dot: "bg-graphite-500", text: "text-graphite-300" },
  processing: { label: "Processing", dot: "bg-cyan animate-pulse", text: "text-cyan" },
  regenerating: { label: "Regenerating", dot: "bg-cyan animate-pulse", text: "text-cyan" },
  edited: { label: "Edited", dot: "bg-white", text: "text-white" },
  approved: { label: "Approved", dot: "bg-emerald-400", text: "text-emerald-300" },
  rejected: { label: "Rejected", dot: "bg-red-400", text: "text-red-300" },
  failed: { label: "Failed", dot: "bg-red-500", text: "text-red-300" },
};

export function JobViewer({
  jobId,
  photo,
  index,
  total,
  onClose,
  onPrev,
  onNext,
  onEnhance,
  onApprove,
  onReject,
}: Props) {
  const [showCompare, setShowCompare] = useState(false);
  const badge = statusConfig[photo.status] ?? statusConfig.pending;

  const canCompare = photo.hasEdited && photo.hasOriginal;
  const base = `/api/jobs/${jobId}/photos/${photo.id}/thumb`;
  const displaySrc = `${base}?size=large`;
  const beforeSrc = `${base}?size=large&variant=original`;
  const afterSrc = `${base}?size=large&variant=edited`;

  const hasAnyImage = photo.hasEdited || photo.hasOriginal || photo.hasThumbnail;

  return (
    <div className="fixed inset-0 z-50 bg-graphite-950/95 backdrop-blur-sm flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-graphite-900/80">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full border border-graphite-800 text-graphite-400 hover:text-white hover:border-graphite-600 transition flex items-center justify-center"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-[13px] text-graphite-500 tabular-nums">
            {index + 1} <span className="text-graphite-700">of</span> {total}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-graphite-900 text-[11px] font-medium">
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            <span className={badge.text}>{badge.label}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canCompare && (
            <button
              onClick={() => setShowCompare((s) => !s)}
              className={`h-9 px-3 rounded-lg text-[13px] font-medium border transition ${
                showCompare
                  ? "bg-cyan/15 text-cyan border-cyan/30"
                  : "bg-graphite-900 text-graphite-300 border-graphite-800 hover:text-white hover:border-graphite-600"
              }`}
            >
              Compare
            </button>
          )}
          <button
            onClick={onEnhance}
            className="h-9 px-4 rounded-lg bg-cyan text-graphite-950 text-[13px] font-semibold hover:bg-cyan-400 transition shadow-lg shadow-cyan/20"
          >
            Enhance
          </button>
          <button
            onClick={onApprove}
            className="h-9 px-4 rounded-lg bg-emerald-500 text-white text-[13px] font-semibold hover:bg-emerald-400 transition"
          >
            Approve
          </button>
          <button
            onClick={onReject}
            className="h-9 px-4 rounded-lg border border-graphite-800 bg-graphite-900 text-red-300 text-[13px] font-semibold hover:border-red-700 hover:bg-red-950/40 transition"
          >
            Reject
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 flex items-center justify-center px-6 pb-6 overflow-hidden relative">
        <button
          onClick={onPrev}
          disabled={index === 0}
          aria-label="Previous"
          className="absolute left-6 w-11 h-11 rounded-full border border-graphite-800 bg-graphite-900/70 backdrop-blur text-white hover:border-graphite-600 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center z-10"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex-1 max-w-6xl h-full flex items-center justify-center">
          {showCompare && canCompare ? (
            <BeforeAfterSlider
              beforeSrc={beforeSrc}
              afterSrc={afterSrc}
              aspectClass="aspect-[3/2]"
              className="max-h-full max-w-full"
              alt="Before / after"
            />
          ) : hasAnyImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displaySrc}
              alt=""
              className="max-h-full max-w-full object-contain rounded-2xl"
            />
          ) : (
            <div className="text-graphite-500 text-sm">
              No image available yet. Run enhance to generate one.
            </div>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={index === total - 1}
          aria-label="Next"
          className="absolute right-6 w-11 h-11 rounded-full border border-graphite-800 bg-graphite-900/70 backdrop-blur text-white hover:border-graphite-600 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center z-10"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {photo.errorMessage && (
        <div className="px-6 pb-4 text-xs text-red-300 text-center">{photo.errorMessage}</div>
      )}
    </div>
  );
}
