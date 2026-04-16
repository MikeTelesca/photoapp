"use client";

import { useState } from "react";

type Props = {
  uploading: boolean;
  syncing: boolean;
  dropboxUrl: string | null;
  onUpload: (files: FileList) => void;
  onSync: () => void;
  /** "empty" = the big hero zone when a job has 0 photos.
   *  "compact" = the thin bar rendered above the grid when photos already exist. */
  variant?: "empty" | "compact";
};

export function UploadZone({ uploading, syncing, dropboxUrl, onUpload, onSync, variant = "empty" }: Props) {
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  }

  if (variant === "compact") {
    return (
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
        <span className="text-[13px] text-graphite-400 mr-1">Drag photos in, or</span>
        <BrowseButton uploading={uploading} onUpload={onUpload} size="sm" />
        {dropboxUrl && (
          <>
            <span className="text-[13px] text-graphite-600">·</span>
            <OpenFolderLink url={dropboxUrl} size="sm" />
            <SyncButton syncing={syncing} onSync={onSync} size="sm" />
          </>
        )}
      </div>
    );
  }

  return (
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
        {dragging ? "Drop 'em" : "Drop photos here"}
      </h3>
      <p className="text-sm text-graphite-400 mb-8 max-w-md mx-auto">
        Drag a folder of bracketed HDR shots directly into this area, or use one of the options below.
      </p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <BrowseButton uploading={uploading} onUpload={onUpload} size="lg" />
        {dropboxUrl && (
          <>
            <OpenFolderLink url={dropboxUrl} size="lg" />
            <SyncButton syncing={syncing} onSync={onSync} size="lg" />
          </>
        )}
      </div>
      {dropboxUrl && (
        <p className="mt-6 text-[11px] text-graphite-600 max-w-md mx-auto">
          Tip: "Open Dropbox folder" pops the shared folder in a new tab — drop your photos
          there in Dropbox, then come back and hit "Sync from Dropbox".
        </p>
      )}
    </div>
  );
}

function BrowseButton({
  uploading,
  onUpload,
  size,
}: {
  uploading: boolean;
  onUpload: (f: FileList) => void;
  size: "sm" | "lg";
}) {
  const cls =
    size === "lg"
      ? "h-11 px-6 text-sm font-semibold shadow-lg shadow-cyan/20"
      : "h-8 px-3 text-[13px] font-medium";
  return (
    <label className={`${cls} rounded-xl bg-cyan text-graphite-950 hover:bg-cyan-400 cursor-pointer transition inline-flex items-center gap-2`}>
      {size === "lg" && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v9M4 6l4-4 4 4M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {uploading ? "Uploading…" : size === "lg" ? "Browse files" : "Browse"}
      <input
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={(e) => e.target.files && onUpload(e.target.files)}
      />
    </label>
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
}: {
  syncing: boolean;
  onSync: () => void;
  size: "sm" | "lg";
}) {
  const cls =
    size === "lg"
      ? "h-11 px-5 text-sm font-medium"
      : "h-8 px-3 text-[13px] font-medium";
  return (
    <button
      onClick={onSync}
      disabled={syncing}
      className={`${cls} rounded-xl border border-graphite-800 bg-graphite-900 text-graphite-200 hover:text-white hover:border-graphite-600 disabled:opacity-40 disabled:cursor-not-allowed transition`}
    >
      {syncing ? "Syncing…" : "Sync from Dropbox"}
    </button>
  );
}
