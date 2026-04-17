"use client";

import { useState } from "react";

type Progress = { done: number; total: number } | null;

type Props = {
  uploading: boolean;
  syncing: boolean;
  importing: boolean;
  progress: Progress;
  dropboxUrl: string | null;
  onUpload: (files: FileList) => void;
  onSync: () => void;
  onImportLink: (url: string) => void;
  /** "empty" = big hero dropzone when the job has 0 photos.
   *  "compact" = slim bar above the grid once photos exist. */
  variant?: "empty" | "compact";
};

export function UploadZone({
  uploading,
  syncing,
  importing,
  progress,
  dropboxUrl,
  onUpload,
  onSync,
  onImportLink,
  variant = "empty",
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  }

  function submitLink() {
    const v = linkValue.trim();
    if (!v) return;
    onImportLink(v);
    setLinkOpen(false);
    setLinkValue("");
  }

  const busy = uploading || importing || syncing;

  if (variant === "compact") {
    return (
      <>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-wrap items-center gap-2 rounded-2xl border ${
            dragging ? "border-cyan bg-cyan/5" : "border-graphite-800 bg-graphite-900/60"
          } p-3 transition-colors`}
        >
          {progress ? (
            <ProgressPill progress={progress} />
          ) : (
            <span className="text-[13px] text-graphite-400 mr-1">Add photos:</span>
          )}
          <BrowseButton uploading={uploading} onUpload={onUpload} size="sm" disabled={busy} />
          <ImportLinkButton size="sm" onClick={() => setLinkOpen(true)} disabled={busy} />
          {dropboxUrl && (
            <>
              <OpenFolderLink url={dropboxUrl} size="sm" />
              <SyncButton syncing={syncing} onSync={onSync} size="sm" disabled={busy} />
            </>
          )}
        </div>
        <ImportLinkModal
          open={linkOpen}
          value={linkValue}
          onChange={setLinkValue}
          onClose={() => setLinkOpen(false)}
          onSubmit={submitLink}
          busy={importing}
        />
      </>
    );
  }

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-3xl border-2 border-dashed p-12 sm:p-16 text-center transition-all ${
          dragging
            ? "border-cyan bg-cyan/10 scale-[1.01]"
            : "border-graphite-800 bg-graphite-900/40 hover:border-graphite-700"
        }`}
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-graphite-500 mb-3">
          Add photos
        </div>
        <h3 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-2">
          {dragging ? "Drop 'em" : progress ? "Uploading…" : "Drop photos here"}
        </h3>
        <p className="text-sm text-graphite-400 mb-8 max-w-md mx-auto">
          {progress
            ? `Sending file ${progress.done} of ${progress.total}…`
            : importing
              ? "Copying photos from the shooter's link to your Dropbox…"
              : "Drag a folder of bracketed shots, or paste a shooter's Dropbox link below."}
        </p>

        {progress && (
          <div className="max-w-md mx-auto mb-6">
            <div className="h-1.5 rounded-full bg-graphite-800 overflow-hidden">
              <div
                className="h-full bg-cyan transition-all"
                style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <BrowseButton uploading={uploading} onUpload={onUpload} size="lg" disabled={busy} />
          <ImportLinkButton size="lg" onClick={() => setLinkOpen(true)} disabled={busy} />
          {dropboxUrl && (
            <>
              <OpenFolderLink url={dropboxUrl} size="lg" />
              <SyncButton syncing={syncing} onSync={onSync} size="lg" disabled={busy} />
            </>
          )}
        </div>

        <p className="mt-6 text-[11px] text-graphite-600 max-w-lg mx-auto">
          <span className="text-graphite-400">Shooter workflow:</span> paste the Dropbox folder
          link they sent you — the app downloads and copies everything into this job's folder
          automatically.
        </p>
      </div>

      <ImportLinkModal
        open={linkOpen}
        value={linkValue}
        onChange={setLinkValue}
        onClose={() => setLinkOpen(false)}
        onSubmit={submitLink}
        busy={importing}
      />
    </>
  );
}

function ProgressPill({ progress }: { progress: NonNullable<Progress> }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 h-8 rounded-full bg-cyan/10 border border-cyan/30 text-cyan text-[13px] font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
      Uploading {progress.done}/{progress.total}
    </span>
  );
}

function BrowseButton({
  uploading,
  onUpload,
  size,
  disabled,
}: {
  uploading: boolean;
  onUpload: (f: FileList) => void;
  size: "sm" | "lg";
  disabled?: boolean;
}) {
  const cls =
    size === "lg"
      ? "h-11 px-6 text-sm font-semibold shadow-lg shadow-cyan/20"
      : "h-8 px-3 text-[13px] font-medium";
  return (
    <label
      className={`${cls} rounded-xl bg-cyan text-graphite-950 hover:bg-cyan-400 cursor-pointer transition inline-flex items-center gap-2 ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {size === "lg" && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v9M4 6l4-4 4 4M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {uploading ? "Uploading…" : size === "lg" ? "Browse files" : "Browse"}
      <input
        type="file"
        multiple
        accept="image/*,.dng,image/x-adobe-dng"
        className="hidden"
        disabled={disabled}
        onChange={(e) => e.target.files && onUpload(e.target.files)}
      />
    </label>
  );
}

function ImportLinkButton({
  size,
  onClick,
  disabled,
}: {
  size: "sm" | "lg";
  onClick: () => void;
  disabled?: boolean;
}) {
  const cls =
    size === "lg"
      ? "h-11 px-5 text-sm font-semibold"
      : "h-8 px-3 text-[13px] font-medium";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${cls} rounded-xl border border-cyan/40 bg-cyan/10 text-cyan hover:bg-cyan/20 hover:border-cyan disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-2`}
    >
      {size === "lg" && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 9L9 5M4 3h3M3 4v3M11 7v3M10 11h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )}
      Paste Dropbox link
    </button>
  );
}

function OpenFolderLink({ url, size }: { url: string; size: "sm" | "lg" }) {
  const cls =
    size === "lg"
      ? "h-11 px-5 text-sm font-medium"
      : "h-8 px-3 text-[13px] font-medium";
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cls} rounded-xl border border-graphite-800 bg-graphite-900 text-graphite-200 hover:text-white hover:border-graphite-600 transition inline-flex items-center gap-1.5`}
    >
      Open Dropbox folder
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M4 3h5v5M9 3L3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

function SyncButton({
  syncing,
  onSync,
  size,
  disabled,
}: {
  syncing: boolean;
  onSync: () => void;
  size: "sm" | "lg";
  disabled?: boolean;
}) {
  const cls =
    size === "lg"
      ? "h-11 px-5 text-sm font-medium"
      : "h-8 px-3 text-[13px] font-medium";
  return (
    <button
      onClick={onSync}
      disabled={disabled ?? syncing}
      className={`${cls} rounded-xl border border-graphite-800 bg-graphite-900 text-graphite-200 hover:text-white hover:border-graphite-600 disabled:opacity-40 disabled:cursor-not-allowed transition`}
    >
      {syncing ? "Syncing…" : "Sync from Dropbox"}
    </button>
  );
}

function ImportLinkModal({
  open,
  value,
  onChange,
  onClose,
  onSubmit,
  busy,
}: {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-graphite-900 border border-graphite-800 rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-graphite-800">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan mb-1">
              Import from link
            </div>
            <h2 className="text-xl font-semibold text-white tracking-tight">
              Paste shooter's Dropbox link
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-graphite-800 text-graphite-400 hover:text-white hover:border-graphite-600 flex items-center justify-center"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-[0.2em] text-graphite-500 mb-2 block">
              Shooter's folder URL
            </label>
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && value.trim()) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="https://www.dropbox.com/scl/fo/..."
              autoFocus
              disabled={busy}
              className="w-full h-12 px-4 rounded-xl bg-graphite-950 border border-graphite-800 text-sm text-white placeholder:text-graphite-600 focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition"
            />
          </div>
          <p className="text-[12px] text-graphite-500 leading-relaxed">
            The folder needs to be shared as "Anyone with the link can view". The app downloads
            all photos from there and mirrors them into this job's Dropbox folder. Google Drive
            support coming soon.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-graphite-800">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-10 px-4 rounded-xl text-sm font-medium text-graphite-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy || !value.trim()}
            className="h-10 px-5 rounded-xl bg-cyan text-graphite-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan/20 transition"
          >
            {busy ? "Importing…" : "Import photos"}
          </button>
        </div>
      </div>
    </div>
  );
}
