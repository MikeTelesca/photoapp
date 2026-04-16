"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { JobGrid, type PhotoRow } from "@/components/jobs/job-grid";
import { JobViewer } from "@/components/jobs/job-viewer";

export type JobSummary = {
  id: string;
  address: string;
  status: string;
  dropboxUrl: string | null;
  preset: string;
  totalPhotos: number;
  processedPhotos: number;
  approvedPhotos: number;
};

type Props = {
  initialJob: JobSummary;
  initialPhotos: PhotoRow[];
};

export function JobView({ initialJob, initialPhotos }: Props) {
  const router = useRouter();
  const [photos, setPhotos] = useState<PhotoRow[]>(initialPhotos);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const approvedCount = useMemo(
    () => photos.filter((p) => p.status === "approved").length,
    [photos]
  );
  const pendingCount = useMemo(
    () => photos.filter((p) => p.status === "pending").length,
    [photos]
  );

  const reloadPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${initialJob.id}/photos`, { cache: "no-store" });
      if (!res.ok) return;
      const data: unknown = await res.json();
      if (Array.isArray(data)) {
        setPhotos(data as PhotoRow[]);
      }
    } catch {
      // ignore
    }
  }, [initialJob.id]);

  const syncDropbox = useCallback(async () => {
    if (!initialJob.dropboxUrl) return;
    setSyncing(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${initialJob.id}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dropboxUrl: initialJob.dropboxUrl }),
      });
      if (!res.ok) throw new Error("Dropbox sync failed");
      await reloadPhotos();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [initialJob.dropboxUrl, initialJob.id, reloadPhotos, router]);

  const startEnhance = useCallback(async () => {
    setEnhancing(true);
    setError("");
    try {
      // Loop: keep calling start-enhance until no more pending photos
      for (let i = 0; i < 100; i += 1) {
        const res = await fetch(`/api/jobs/${initialJob.id}/start-enhance`, {
          method: "POST",
        });
        if (!res.ok) throw new Error("Enhance failed");
        await reloadPhotos();
        const latest = await fetch(`/api/jobs/${initialJob.id}/photos`, {
          cache: "no-store",
        });
        if (!latest.ok) break;
        const data: unknown = await latest.json();
        if (!Array.isArray(data)) break;
        const stillPending = (data as PhotoRow[]).some((p) => p.status === "pending");
        if (!stillPending) break;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Enhance failed");
    } finally {
      setEnhancing(false);
    }
  }, [initialJob.id, reloadPhotos, router]);

  const enhanceOne = useCallback(
    async (photoId: string) => {
      setError("");
      try {
        const res = await fetch(
          `/api/jobs/${initialJob.id}/photos/${photoId}/enhance`,
          { method: "POST" }
        );
        if (!res.ok) throw new Error("Enhance failed");
        await reloadPhotos();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Enhance failed");
      }
    },
    [initialJob.id, reloadPhotos]
  );

  const updatePhotoStatus = useCallback(
    async (photoId: string, status: string) => {
      setError("");
      try {
        const res = await fetch(
          `/api/jobs/${initialJob.id}/photos/${photoId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }
        );
        if (!res.ok) throw new Error("Update failed");
        setPhotos((ps) =>
          ps.map((p) => (p.id === photoId ? { ...p, status } : p))
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    },
    [initialJob.id]
  );

  const deletePhoto = useCallback(
    async (photoId: string) => {
      setError("");
      try {
        const res = await fetch(
          `/api/jobs/${initialJob.id}/photos/${photoId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Delete failed");
        setPhotos((ps) => ps.filter((p) => p.id !== photoId));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [initialJob.id]
  );

  const downloadZip = useCallback(async () => {
    if (approvedCount === 0) return;
    setDownloading(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${initialJob.id}/download-zip`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${initialJob.address.replace(/[^a-z0-9]+/gi, "-")}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }, [approvedCount, initialJob.id, initialJob.address]);

  const uploadFiles = useCallback(
    async (files: FileList) => {
      if (!files.length) return;
      setUploading(true);
      setError("");
      try {
        const formData = new FormData();
        for (const f of Array.from(files)) formData.append("files", f);
        const res = await fetch(`/api/jobs/${initialJob.id}/ingest-uploaded`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Upload failed");
        await reloadPhotos();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [initialJob.id, reloadPhotos]
  );

  // Viewer keyboard nav
  useEffect(() => {
    if (viewerIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setViewerIndex(null);
      if (e.key === "ArrowRight")
        setViewerIndex((i) => (i === null ? null : Math.min(photos.length - 1, i + 1)));
      if (e.key === "ArrowLeft")
        setViewerIndex((i) => (i === null ? null : Math.max(0, i - 1)));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerIndex, photos.length]);

  const btn =
    "h-9 px-4 rounded-md text-sm font-medium disabled:opacity-50 transition-colors";

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{initialJob.address}</h1>
          <p className="text-xs text-graphite-500 mt-0.5">
            {photos.length} photos · {approvedCount} approved · {pendingCount} pending
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {initialJob.dropboxUrl ? (
            <button
              onClick={syncDropbox}
              disabled={syncing}
              className={`${btn} border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-900 hover:bg-graphite-50 dark:hover:bg-graphite-800`}
            >
              {syncing ? "Syncing…" : "Sync from Dropbox"}
            </button>
          ) : (
            <label
              className={`${btn} cursor-pointer border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-900 hover:bg-graphite-50 dark:hover:bg-graphite-800 inline-flex items-center`}
            >
              {uploading ? "Uploading…" : "Upload photos"}
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => e.target.files && uploadFiles(e.target.files)}
              />
            </label>
          )}
          <button
            onClick={startEnhance}
            disabled={enhancing || pendingCount === 0}
            className={`${btn} bg-cyan text-white hover:bg-cyan-600`}
          >
            {enhancing ? "Enhancing…" : `Start enhance (${pendingCount})`}
          </button>
          <button
            onClick={downloadZip}
            disabled={downloading || approvedCount === 0}
            className={`${btn} bg-graphite-900 dark:bg-white text-white dark:text-graphite-900 hover:bg-graphite-800 dark:hover:bg-graphite-100`}
          >
            {downloading ? "Zipping…" : `Download ZIP (${approvedCount})`}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      <JobGrid
        photos={photos}
        onOpen={(i) => setViewerIndex(i)}
        onEnhance={enhanceOne}
        onApprove={(id) => updatePhotoStatus(id, "approved")}
        onReject={(id) => updatePhotoStatus(id, "rejected")}
        onDelete={deletePhoto}
      />

      {viewerIndex !== null && photos[viewerIndex] && (
        <JobViewer
          photo={photos[viewerIndex]}
          index={viewerIndex}
          total={photos.length}
          onClose={() => setViewerIndex(null)}
          onPrev={() => setViewerIndex((i) => (i === null ? null : Math.max(0, i - 1)))}
          onNext={() =>
            setViewerIndex((i) => (i === null ? null : Math.min(photos.length - 1, i + 1)))
          }
          onEnhance={() => enhanceOne(photos[viewerIndex].id)}
          onApprove={() => updatePhotoStatus(photos[viewerIndex].id, "approved")}
          onReject={() => updatePhotoStatus(photos[viewerIndex].id, "rejected")}
        />
      )}
    </div>
  );
}
