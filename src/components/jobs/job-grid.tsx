"use client";

import { useEffect, useRef, useState } from "react";

export type PhotoRow = {
  id: string;
  orderIndex: number;
  status: string;
  // Short http URLs when available (Dropbox CDN). Null when the photo has no
  // source yet or the URL lives only as a legacy data URL in the DB.
  originalUrl: string | null;
  editedUrl: string | null;
  thumbnailUrl: string | null;
  hasOriginal: boolean;
  hasEdited: boolean;
  hasThumbnail: boolean;
  errorMessage: string | null;
  /** Number of source exposures for this bracket group (3-shot, 5-shot, etc). */
  bracketCount: number;
  // Per-photo overrides — null means "inherit from the parent Job".
  preset: string | null;
  tvStyle: string | null;
  skyStyle: string | null;
  seasonalStyle: string | null;
  customInstructions: string | null;
};

type Props = {
  jobId: string;
  photos: PhotoRow[];
  onOpen: (index: number) => void;
  onEnhance: (photoId: string) => void;
  onApprove: (photoId: string) => void;
  onReject: (photoId: string) => void;
  onDelete: (photoId: string) => void;
  onOpenSettings: (index: number) => void;
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

// Deterministic gradient per photo id for blank placeholders while the photo
// has no image source yet (pre-ingest, pre-enhance).
function gradientForId(id: string): string {
  const palette = [
    "from-indigo-900 via-purple-800 to-rose-800",
    "from-cyan-900 via-sky-800 to-emerald-800",
    "from-amber-900 via-orange-800 to-red-800",
    "from-fuchsia-900 via-violet-800 to-indigo-800",
    "from-teal-900 via-emerald-800 to-lime-800",
    "from-slate-900 via-blue-900 to-cyan-800",
  ];
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export function JobGrid({ jobId, photos, onOpen, onEnhance, onApprove, onReject, onDelete, onOpenSettings }: Props) {
  // Keyboard shortcuts — whichever tile is currently hovered (or last-hovered)
  // responds to A/R/D/E/Enter. Skips if the user is typing into an input.
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hoveredRef = useRef<number | null>(null);
  useEffect(() => {
    hoveredRef.current = hoveredIndex;
  }, [hoveredIndex]);

  useEffect(() => {
    if (photos.length === 0) return;
    function onKey(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) return;
      }
      const idx = hoveredRef.current;
      if (idx === null || idx < 0 || idx >= photos.length) return;
      const p = photos[idx];
      // Ignore modifier keys — don't hijack Cmd/Ctrl+R (browser reload) etc.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "a") {
        e.preventDefault();
        onApprove(p.id);
      } else if (k === "r") {
        e.preventDefault();
        onReject(p.id);
      } else if (k === "e") {
        e.preventDefault();
        onEnhance(p.id);
      } else if (k === "delete" || k === "backspace") {
        e.preventDefault();
        onDelete(p.id);
      } else if (k === "enter") {
        e.preventDefault();
        onOpen(idx);
      } else if (k === "s") {
        e.preventDefault();
        onOpenSettings(idx);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photos, onApprove, onReject, onEnhance, onDelete, onOpen, onOpenSettings]);

  if (photos.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-graphite-800 bg-graphite-900/40 p-16 text-center">
        <div className="text-[11px] uppercase tracking-[0.25em] text-graphite-500 mb-3">
          No photos yet
        </div>
        <p className="text-lg text-graphite-300">
          Sync from Dropbox or upload to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <KeyboardHelpStrip />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {photos.map((p, i) => (
          <div
            key={p.id}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex((cur) => (cur === i ? null : cur))}
          >
            <PhotoTile
              jobId={jobId}
              photo={p}
              index={i}
              isHovered={hoveredIndex === i}
              onOpen={() => onOpen(i)}
              onEnhance={() => onEnhance(p.id)}
              onApprove={() => onApprove(p.id)}
              onReject={() => onReject(p.id)}
              onDelete={() => onDelete(p.id)}
              onOpenSettings={() => onOpenSettings(i)}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function KeyboardHelpStrip() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-graphite-500">
      <span className="uppercase tracking-[0.2em] mr-1">Hover a tile</span>
      <Kbd>A</Kbd> approve
      <Kbd>R</Kbd> reject
      <Kbd>E</Kbd> re-enhance
      <Kbd>S</Kbd> settings
      <Kbd>Enter</Kbd> open
      <Kbd>Del</Kbd> remove
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-graphite-900 border border-graphite-800 text-graphite-300 font-mono text-[10px] min-w-[1.5em] justify-center">
      {children}
    </span>
  );
}

function PhotoTile({
  jobId,
  photo,
  index,
  isHovered,
  onOpen,
  onEnhance,
  onApprove,
  onReject,
  onDelete,
  onOpenSettings,
}: {
  jobId: string;
  photo: PhotoRow;
  index: number;
  isHovered: boolean;
  onOpen: () => void;
  onEnhance: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onOpenSettings: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const badge = statusConfig[photo.status] ?? statusConfig.pending;
  // Always try /thumb — the route falls back to Dropbox path lookup when no
  // URL is stored (e.g. freshly-uploaded brackets). Only drop to the gradient
  // placeholder if the thumb endpoint 404s or fails.
  const showImage = !imgError;
  // Prefer the direct Dropbox CDN URL so the browser never pipes through our
  // serverless function; otherwise hit /thumb which handles Dropbox fallback
  // via the file path embedded in exifData.
  const directThumb = photo.thumbnailUrl || photo.editedUrl || photo.originalUrl;
  const thumbSrc = directThumb ?? `/api/jobs/${jobId}/photos/${photo.id}/thumb`;
  // Pending photos have no edited image to view yet — clicking the tile body
  // should open settings where the user can adjust the look before enhancing.
  const primaryOpen = photo.status === "pending" ? onOpenSettings : onOpen;

  return (
    <div
      className={`group relative aspect-[3/2] overflow-hidden rounded-2xl bg-graphite-900 border transition-colors ${
        isHovered
          ? "border-cyan/70 ring-2 ring-cyan/20"
          : "border-graphite-800 hover:border-graphite-600"
      }`}
    >
      {/* Cover */}
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbSrc}
          alt={`Photo ${index + 1}`}
          className="absolute inset-0 w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-[1.04]"
          onClick={primaryOpen}
          onError={() => setImgError(true)}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <button
          type="button"
          onClick={primaryOpen}
          className={`absolute inset-0 w-full h-full bg-gradient-to-br ${gradientForId(photo.id)}`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/40 text-xs font-medium tracking-wider uppercase">
              #{photo.orderIndex + 1}
            </span>
          </div>
        </button>
      )}

      {/* Status chip */}
      <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-graphite-950/80 backdrop-blur border border-white/10 text-[11px] font-medium z-10">
        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
        <span className={badge.text}>{badge.label}</span>
      </span>

      {/* Right-side chips — bracket count + photo index */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
        {photo.bracketCount > 1 && (
          <span
            className="tabular-nums text-[10px] px-2 py-0.5 rounded-full bg-graphite-950/70 backdrop-blur text-cyan border border-cyan/30 font-medium"
            title={`${photo.bracketCount}-shot bracketed HDR`}
          >
            {photo.bracketCount}× HDR
          </span>
        )}
        <span className="tabular-nums text-[10px] px-2 py-0.5 rounded-full bg-graphite-950/70 backdrop-blur text-white/70 border border-white/5">
          {index + 1}
        </span>
      </div>

      {/* Bottom gradient + actions */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-graphite-950/90 via-graphite-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="absolute inset-x-0 bottom-0 p-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0 duration-200">
        <IconButton label="View" onClick={onOpen} icon="view" />
        <IconButton
          label="Enhance"
          onClick={onEnhance}
          icon="enhance"
          disabled={photo.status === "processing"}
        />
        <IconButton
          label="Approve"
          onClick={onApprove}
          icon="check"
          tone={photo.status === "approved" ? "emerald" : "default"}
        />
        <IconButton
          label="Reject"
          onClick={onReject}
          icon="x"
          tone={photo.status === "rejected" ? "red" : "default"}
        />
        <div className="flex-1" />
        <IconButton label="Settings" onClick={onOpenSettings} icon="gear" />
        <IconButton label="Delete" onClick={onDelete} icon="trash" tone="danger" />
      </div>

      {/* Processing veil */}
      {photo.status === "processing" && (
        <div className="absolute inset-0 bg-cyan/5 border-2 border-cyan/40 rounded-2xl pointer-events-none" />
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  icon,
  tone = "default",
  disabled,
}: {
  label: string;
  onClick: () => void;
  icon: "view" | "enhance" | "check" | "x" | "trash" | "gear";
  tone?: "default" | "emerald" | "red" | "danger";
  disabled?: boolean;
}) {
  const toneCls = {
    default: "bg-white/10 hover:bg-white/20 text-white",
    emerald: "bg-emerald-500/90 hover:bg-emerald-500 text-white",
    red: "bg-red-500/90 hover:bg-red-500 text-white",
    danger: "bg-white/10 hover:bg-red-500/90 hover:text-white text-white/70",
  }[tone];
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={`w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${toneCls}`}
    >
      {renderIcon(icon)}
    </button>
  );
}

function renderIcon(kind: "view" | "enhance" | "check" | "x" | "trash" | "gear") {
  const p = "currentColor";
  switch (kind) {
    case "gear":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2" stroke={p} strokeWidth="1.3" />
          <path
            d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M3.05 12.95l1.4-1.4M11.55 4.45l1.4-1.4"
            stroke={p}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "view":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M1.5 8c1.5-3 4-5 6.5-5s5 2 6.5 5c-1.5 3-4 5-6.5 5s-5-2-6.5-5z" stroke={p} strokeWidth="1.3" />
          <circle cx="8" cy="8" r="2" stroke={p} strokeWidth="1.3" />
        </svg>
      );
    case "enhance":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 1v3M8 12v3M1 8h3M12 8h3M3.5 3.5l2 2M10.5 10.5l2 2M3.5 12.5l2-2M10.5 5.5l2-2" stroke={p} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case "check":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5L6.5 12L13 4" stroke={p} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "x":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 3L13 13M13 3L3 13" stroke={p} strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "trash":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 5h10M6.5 5V3h3v2M5 5v9h6V5M7 8v3M9 8v3" stroke={p} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}
