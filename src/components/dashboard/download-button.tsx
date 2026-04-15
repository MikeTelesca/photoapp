"use client";

import { useEffect, useRef, useState } from "react";

export function DownloadButton({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-stretch rounded overflow-hidden">
        <a
          href={`/api/jobs/${jobId}/download-zip`}
          className="text-xs px-3 py-1.5 bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
          download
        >
          Download ZIP
        </a>
        <button
          type="button"
          aria-label="More download options"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="text-xs px-2 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 border-l border-emerald-700"
        >
          ▾
        </button>
      </div>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded border border-gray-200 bg-white shadow-lg">
          <a
            href={`/api/jobs/${jobId}/download-zip`}
            download
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-xs text-gray-800 hover:bg-gray-100"
          >
            Download edited (ZIP)
          </a>
          <a
            href={`/api/jobs/${jobId}/download-originals`}
            download
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-xs text-gray-800 hover:bg-gray-100 border-t border-gray-100"
          >
            Download originals (ZIP)
          </a>
        </div>
      )}
    </div>
  );
}
