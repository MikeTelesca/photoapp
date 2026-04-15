"use client";

export function DownloadButton({ jobId }: { jobId: string }) {
  return (
    <a
      href={`/api/jobs/${jobId}/download-zip`}
      className="text-xs px-3 py-1.5 rounded bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
      onClick={(e) => e.stopPropagation()}
      download
    >
      Download ZIP
    </a>
  );
}
