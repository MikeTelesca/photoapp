"use client";
import { useState, useEffect } from "react";

interface Version { id: string; url: string; preset?: string | null; createdAt: string; }

export function PhotoVersions({ jobId, photoId }: { jobId: string; photoId: string }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [open, setOpen] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/jobs/${jobId}/photos/${photoId}/versions`)
      .then(r => r.json())
      .then(d => setVersions(d.versions || []))
      .catch(() => {});
  }, [open, jobId, photoId]);

  async function revert(id: string) {
    if (!confirm("Revert to this version? Current edit will be saved as a backup.")) return;
    setReverting(id);
    try {
      const res = await fetch(`/api/jobs/${jobId}/photos/${photoId}/versions/${id}/revert`, { method: "POST" });
      if (res.ok) window.location.reload();
    } finally {
      setReverting(null);
    }
  }

  if (versions.length === 0 && !open) {
    return (
      <button onClick={() => setOpen(true)}
        className="text-[10px] text-graphite-400 hover:text-cyan underline">
        Show enhancement history
      </button>
    );
  }

  return (
    <div className="border border-graphite-100 dark:border-graphite-800 rounded">
      <button onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 text-xs font-semibold text-graphite-600 dark:text-graphite-300 flex justify-between items-center hover:bg-graphite-50 dark:hover:bg-graphite-800">
        Enhancement history {versions.length > 0 && <span className="text-cyan">({versions.length})</span>}
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="px-3 py-2 border-t border-graphite-100 dark:border-graphite-800">
          {versions.length === 0 ? (
            <div className="text-xs text-graphite-400 py-2">No previous versions</div>
          ) : (
            <ul className="space-y-1">
              {versions.map(v => (
                <li key={v.id} className="flex items-center gap-2 text-xs">
                  <a href={v.url} target="_blank" rel="noopener noreferrer"
                    className="text-cyan hover:underline truncate flex-1">
                    {v.preset || "version"} · {new Date(v.createdAt).toLocaleString()}
                  </a>
                  <button onClick={() => revert(v.id)} disabled={reverting === v.id}
                    className="text-[10px] px-2 py-0.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300">
                    {reverting === v.id ? "..." : "Revert"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
