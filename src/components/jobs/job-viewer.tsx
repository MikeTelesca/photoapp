"use client";

import { BeforeAfterSlider } from "@/components/ui/before-after-slider";
import type { PhotoRow } from "@/components/jobs/job-grid";

type Props = {
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

export function JobViewer({
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
  const hasBothImages = !!photo.originalUrl && !!photo.editedUrl;
  const displaySrc = photo.editedUrl || photo.originalUrl || "";

  const navBtn =
    "h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur disabled:opacity-30";
  const actionBtn =
    "px-4 h-9 rounded-md text-sm font-medium text-white backdrop-blur";

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between px-5 h-14 text-white text-sm">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="hover:text-cyan">
            ← Close
          </button>
          <span className="text-white/60">
            {index + 1} / {total}
          </span>
          <span className="text-white/60 uppercase text-[11px] tracking-wide">
            {photo.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEnhance} className={`${actionBtn} bg-cyan hover:bg-cyan-600`}>
            Enhance
          </button>
          <button
            onClick={onApprove}
            className={`${actionBtn} bg-emerald-600 hover:bg-emerald-500`}
          >
            Approve
          </button>
          <button
            onClick={onReject}
            className={`${actionBtn} bg-red-600 hover:bg-red-500`}
          >
            Reject
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-6 overflow-hidden">
        <button onClick={onPrev} disabled={index === 0} className={`${navBtn} mr-3`}>
          ←
        </button>

        <div className="flex-1 max-w-6xl h-full flex items-center justify-center">
          {hasBothImages && photo.originalUrl && photo.editedUrl ? (
            <BeforeAfterSlider
              beforeSrc={photo.originalUrl}
              afterSrc={photo.editedUrl}
              aspectClass="aspect-[3/2]"
              className="max-h-full max-w-full"
              alt="Before / after"
            />
          ) : displaySrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displaySrc}
              alt="Photo"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="text-white/60 text-sm">No image available</div>
          )}
        </div>

        <button onClick={onNext} disabled={index === total - 1} className={`${navBtn} ml-3`}>
          →
        </button>
      </div>

      {photo.errorMessage && (
        <div className="px-6 pb-4 text-xs text-red-300 text-center">
          {photo.errorMessage}
        </div>
      )}
    </div>
  );
}
