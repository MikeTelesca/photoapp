"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { JobGrid, type PhotoRow } from "@/components/jobs/job-grid";
import { JobViewer } from "@/components/jobs/job-viewer";
import {
  PhotoSettingsModal,
  type PhotoOverrides,
} from "@/components/jobs/photo-settings-modal";
import { StyleSummary } from "@/components/jobs/style-summary";
import { UploadZone } from "@/components/jobs/upload-zone";

export type JobSummary = {
  id: string;
  address: string;
  status: string;
  dropboxUrl: string | null;
  preset: string;
  tvStyle: string;
  skyStyle: string;
  seasonalStyle: string | null;
  agentName: string | null;
};

type Props = {
  initialJob: JobSummary;
  initialPhotos: PhotoRow[];
};

export function JobView({ initialJob, initialPhotos }: Props) {
  const router = useRouter();
  const [photos, setPhotos] = useState<PhotoRow[]>(initialPhotos);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [settingsIndex, setSettingsIndex] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const counts = useMemo(() => {
    let approved = 0;
    let rejected = 0;
    let pending = 0;
    let edited = 0;
    let processing = 0;
    for (const p of photos) {
      if (p.status === "approved") approved += 1;
      else if (p.status === "rejected") rejected += 1;
      else if (p.status === "edited") edited += 1;
      else if (p.status === "processing" || p.status === "regenerating") processing += 1;
      else pending += 1;
    }
    const total = photos.length;
    const done = approved + rejected;
    const percent = total > 0 ? Math.round(((approved + edited) / total) * 100) : 0;
    return { total, approved, rejected, pending, edited, processing, done, percent };
  }, [photos]);

  const reloadPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${initialJob.id}/photos`, { cache: "no-store" });
      if (!res.ok) return;
      const data: unknown = await res.json();
      if (Array.isArray(data)) setPhotos(data as PhotoRow[]);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [initialJob.dropboxUrl, initialJob.id, reloadPhotos]);

  const startEnhance = useCallback(async () => {
    setEnhancing(true);
    setError("");
    try {
      for (let i = 0; i < 200; i += 1) {
        const res = await fetch(`/api/jobs/${initialJob.id}/start-enhance`, { method: "POST" });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const serverMsg =
            body && typeof body === "object" && "error" in body
              ? String((body as { error: unknown }).error)
              : null;
          throw new Error(serverMsg ?? `Enhance failed (HTTP ${res.status})`);
        }
        await reloadPhotos();
        const latest = await fetch(`/api/jobs/${initialJob.id}/photos`, { cache: "no-store" });
        if (!latest.ok) break;
        const data: unknown = await latest.json();
        if (!Array.isArray(data)) break;
        const stillPending = (data as PhotoRow[]).some((p) => p.status === "pending");
        if (!stillPending) break;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Enhance failed");
    } finally {
      setEnhancing(false);
    }
  }, [initialJob.id, reloadPhotos]);

  const enhanceOne = useCallback(
    async (photoId: string) => {
      setError("");
      setPhotos((ps) => ps.map((p) => (p.id === photoId ? { ...p, status: "processing" } : p)));
      try {
        const res = await fetch(`/api/jobs/${initialJob.id}/photos/${photoId}/enhance`, {
          method: "POST",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const serverMsg =
            body && typeof body === "object" && "error" in body
              ? String((body as { error: unknown }).error)
              : null;
          throw new Error(serverMsg ?? `Enhance failed (HTTP ${res.status})`);
        }
        await reloadPhotos();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Enhance failed");
        await reloadPhotos();
      }
    },
    [initialJob.id, reloadPhotos]
  );

  const updatePhotoStatus = useCallback(
    async (photoId: string, status: string) => {
      setError("");
      const prev = photos;
      setPhotos((ps) => ps.map((p) => (p.id === photoId ? { ...p, status } : p)));
      try {
        const res = await fetch(`/api/jobs/${initialJob.id}/photos/${photoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error("Update failed");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Update failed");
        setPhotos(prev);
      }
    },
    [initialJob.id, photos]
  );

  const savePhotoOverrides = useCallback(
    async (photoId: string, overrides: PhotoOverrides) => {
      setError("");
      const res = await fetch(`/api/jobs/${initialJob.id}/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrides),
      });
      if (!res.ok) throw new Error("Save failed");
      await reloadPhotos();
    },
    [initialJob.id, reloadPhotos],
  );

  const deletePhoto = useCallback(
    async (photoId: string) => {
      setError("");
      const prev = photos;
      setPhotos((ps) => ps.filter((p) => p.id !== photoId));
      try {
        const res = await fetch(`/api/jobs/${initialJob.id}/photos/${photoId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Delete failed");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Delete failed");
        setPhotos(prev);
      }
    },
    [initialJob.id, photos]
  );

  const downloadZip = useCallback(async () => {
    if (counts.approved === 0) return;
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
  }, [counts.approved, initialJob.id, initialJob.address]);

  const uploadFiles = useCallback(
    async (files: FileList) => {
      if (!files.length) return;
      setUploading(true);
      setError("");
      const list = Array.from(files);
      setUploadProgress({ done: 0, total: list.length });

      // Browser uploads DIRECTLY to Dropbox (bypassing Vercel's 4.5MB body cap).
      // We mint a short-lived access token + resolve the destination folder
      // server-side, then the browser streams each file straight to Dropbox's
      // content API. Finalise by registering the file metadata with us.
      type UploadConfig = { accessToken: string; folderPath: string; expiresInSec: number };
      let config: UploadConfig;
      try {
        const cfgRes = await fetch(`/api/jobs/${initialJob.id}/upload-config`, {
          cache: "no-store",
        });
        if (!cfgRes.ok) {
          const body = (await cfgRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Could not get upload config");
        }
        const parsed = (await cfgRes.json()) as Partial<UploadConfig>;
        if (!parsed.accessToken || !parsed.folderPath) {
          throw new Error("Upload config missing required fields");
        }
        config = {
          accessToken: parsed.accessToken,
          folderPath: parsed.folderPath,
          expiresInSec: parsed.expiresInSec ?? 14400,
        };
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Upload config failed");
        setUploading(false);
        setUploadProgress(null);
        return;
      }

      const uploaded: Array<{ name: string; path: string; size: number }> = [];
      const failed: Array<{ name: string; reason: string }> = [];

      for (let i = 0; i < list.length; i += 1) {
        const f = list[i];
        const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
        if (![".jpg", ".jpeg", ".png", ".dng"].includes(ext)) {
          failed.push({ name: f.name, reason: "unsupported extension" });
          setUploadProgress({ done: i + 1, total: list.length });
          continue;
        }
        try {
          const dest = `${config.folderPath}/${f.name}`;
          const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.accessToken}`,
              "Content-Type": "application/octet-stream",
              "Dropbox-API-Arg": JSON.stringify({
                path: dest,
                mode: "overwrite",
                autorename: false,
                mute: true,
                strict_conflict: false,
              }),
            },
            body: f,
          });
          if (!res.ok) {
            const txt = await res.text();
            failed.push({ name: f.name, reason: `Dropbox ${res.status}: ${txt.slice(0, 160)}` });
          } else {
            const meta = (await res.json()) as {
              path_display?: string;
              name?: string;
              size?: number;
            };
            uploaded.push({
              name: meta.name ?? f.name,
              path: meta.path_display ?? dest,
              size: meta.size ?? f.size,
            });
          }
        } catch (err: unknown) {
          failed.push({
            name: f.name,
            reason: err instanceof Error ? err.message : "upload failed",
          });
        }
        setUploadProgress({ done: i + 1, total: list.length });
      }

      if (uploaded.length === 0) {
        setError(
          failed.length > 0
            ? `Upload failed: ${failed
                .slice(0, 3)
                .map((x) => `${x.name} (${x.reason})`)
                .join("; ")}${failed.length > 3 ? ` +${failed.length - 3} more` : ""}`
            : "Nothing uploaded",
        );
        setUploading(false);
        setUploadProgress(null);
        return;
      }

      try {
        const res = await fetch(`/api/jobs/${initialJob.id}/ingest-uploaded`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: uploaded }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Ingest failed");
        }
        await reloadPhotos();
        if (failed.length > 0) {
          setError(`Ingested ${uploaded.length}, ${failed.length} failed`);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Ingest failed");
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
    },
    [initialJob.id, reloadPhotos],
  );

  const importFromLink = useCallback(
    async (sourceUrl: string) => {
      setImporting(true);
      setError("");
      try {
        const res = await fetch(`/api/jobs/${initialJob.id}/ingest-from-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceUrl }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Import failed");
        }
        await reloadPhotos();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Import failed");
      } finally {
        setImporting(false);
      }
    },
    [initialJob.id, reloadPhotos],
  );

  // Auto-refresh while anything is processing
  useEffect(() => {
    if (counts.processing === 0 && !enhancing) return;
    const id = setInterval(() => {
      void reloadPhotos();
    }, 3500);
    return () => clearInterval(id);
  }, [counts.processing, enhancing, reloadPhotos]);

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

  void router; // reserved for future refresh calls

  return (
    <main className="min-h-screen bg-graphite-950 text-white">
      {/* Top nav (matches dashboard) */}
      <header className="sticky top-0 z-20 border-b border-graphite-900 bg-graphite-950/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/jobs"
              className="text-[13px] text-graphite-400 hover:text-white flex items-center gap-1.5 transition"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 12L4 7L9 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Jobs
            </Link>
            <span className="text-graphite-700">/</span>
            <span className="text-[13px] text-white font-medium truncate">{initialJob.address}</span>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 pt-10 pb-16 space-y-8">
        {/* Hero — address + style summary */}
        <section className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.25em] text-graphite-500 mb-3">
              Job
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
              {initialJob.address}
            </h1>
            {initialJob.agentName && (
              <div className="mt-3 text-sm text-graphite-400">
                with <span className="text-white font-medium">{initialJob.agentName}</span>
              </div>
            )}
            <StyleSummary
              preset={initialJob.preset}
              tvStyle={initialJob.tvStyle}
              skyStyle={initialJob.skyStyle}
              seasonalStyle={initialJob.seasonalStyle}
            />
          </div>

          <ActionsCluster
            hasDropbox={!!initialJob.dropboxUrl}
            pending={counts.pending}
            approved={counts.approved}
            syncing={syncing}
            enhancing={enhancing}
            downloading={downloading}
            uploading={uploading}
            onSync={syncDropbox}
            onEnhance={startEnhance}
            onDownload={downloadZip}
            onUpload={uploadFiles}
          />
        </section>

        {/* Progress + stats */}
        <section className="rounded-3xl bg-graphite-900 border border-graphite-800 p-6 sm:p-7">
          <div className="flex items-baseline justify-between mb-4 gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-graphite-500">
                Pipeline
              </div>
              <div className="text-2xl font-semibold text-white mt-1 tabular-nums">
                {counts.percent}% <span className="text-graphite-500 text-lg font-normal">complete</span>
              </div>
            </div>
            <div className="text-[11px] text-graphite-500 tabular-nums">
              {counts.total} {counts.total === 1 ? "photo" : "photos"}
            </div>
          </div>

          <div className="relative h-2 rounded-full bg-graphite-950 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan to-emerald-400 transition-all duration-700 ease-out"
              style={{ width: `${counts.percent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mt-6">
            <MiniStat label="Pending" value={counts.pending} tone="graphite" />
            <MiniStat label="Processing" value={counts.processing} tone="cyan" pulse={counts.processing > 0} />
            <MiniStat label="Edited" value={counts.edited} tone="white" />
            <MiniStat label="Approved" value={counts.approved} tone="emerald" />
            <MiniStat label="Rejected" value={counts.rejected} tone="red" />
          </div>
        </section>

        {error && (
          <div className="text-sm text-red-300 bg-red-950/40 border border-red-900/60 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Photo grid */}
        <section className="space-y-4">
          {photos.length === 0 ? (
            <UploadZone
              variant="empty"
              uploading={uploading}
              syncing={syncing}
              importing={importing}
              progress={uploadProgress}
              dropboxUrl={initialJob.dropboxUrl}
              onUpload={uploadFiles}
              onSync={syncDropbox}
              onImportLink={importFromLink}
            />
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <h2 className="text-[11px] uppercase tracking-[0.25em] text-graphite-500">Photos</h2>
              </div>
              <UploadZone
                variant="compact"
                uploading={uploading}
                syncing={syncing}
                importing={importing}
                progress={uploadProgress}
                dropboxUrl={initialJob.dropboxUrl}
                onUpload={uploadFiles}
                onSync={syncDropbox}
                onImportLink={importFromLink}
              />
              <JobGrid
                jobId={initialJob.id}
                photos={photos}
                onOpen={(i) => setViewerIndex(i)}
                onEnhance={enhanceOne}
                onApprove={(id) => updatePhotoStatus(id, "approved")}
                onReject={(id) => updatePhotoStatus(id, "rejected")}
                onDelete={deletePhoto}
                onOpenSettings={(i) => setSettingsIndex(i)}
              />
            </>
          )}
        </section>
      </div>

      {viewerIndex !== null && photos[viewerIndex] && (
        <JobViewer
          jobId={initialJob.id}
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
          onOpenSettings={() => {
            const i = viewerIndex;
            setViewerIndex(null);
            setSettingsIndex(i);
          }}
        />
      )}

      {settingsIndex !== null && photos[settingsIndex] && (
        <PhotoSettingsModal
          jobDefaults={{
            preset: initialJob.preset,
            tvStyle: initialJob.tvStyle,
            skyStyle: initialJob.skyStyle,
            seasonalStyle: initialJob.seasonalStyle,
          }}
          photoOverrides={{
            preset: photos[settingsIndex].preset,
            tvStyle: photos[settingsIndex].tvStyle,
            skyStyle: photos[settingsIndex].skyStyle,
            seasonalStyle: photos[settingsIndex].seasonalStyle,
            customInstructions: photos[settingsIndex].customInstructions,
          }}
          photoOrderIndex={photos[settingsIndex].orderIndex}
          onClose={() => setSettingsIndex(null)}
          onSave={(overrides) =>
            savePhotoOverrides(photos[settingsIndex!].id, overrides)
          }
          onEnhance={() => enhanceOne(photos[settingsIndex!].id)}
        />
      )}
    </main>
  );
}

function MiniStat({
  label,
  value,
  tone,
  pulse,
}: {
  label: string;
  value: number;
  tone: "graphite" | "cyan" | "white" | "emerald" | "red";
  pulse?: boolean;
}) {
  const colorMap = {
    graphite: "text-graphite-400",
    cyan: "text-cyan",
    white: "text-white",
    emerald: "text-emerald-300",
    red: "text-red-300",
  } as const;
  const dotMap = {
    graphite: "bg-graphite-600",
    cyan: "bg-cyan",
    white: "bg-white/90",
    emerald: "bg-emerald-400",
    red: "bg-red-400",
  } as const;
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className={`w-1.5 h-1.5 rounded-full ${dotMap[tone]} ${pulse ? "animate-pulse" : ""}`} />
      <div className="min-w-0">
        <div className={`text-xl font-semibold tabular-nums ${colorMap[tone]}`}>{value}</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-graphite-500 truncate">{label}</div>
      </div>
    </div>
  );
}

function ActionsCluster({
  hasDropbox,
  pending,
  approved,
  syncing,
  enhancing,
  downloading,
  uploading,
  onSync,
  onEnhance,
  onDownload,
  onUpload,
}: {
  hasDropbox: boolean;
  pending: number;
  approved: number;
  syncing: boolean;
  enhancing: boolean;
  downloading: boolean;
  uploading: boolean;
  onSync: () => void;
  onEnhance: () => void;
  onDownload: () => void;
  onUpload: (f: FileList) => void;
}) {
  const ghostBtn =
    "h-10 px-4 rounded-xl text-sm font-medium border border-graphite-800 text-graphite-200 hover:text-white hover:border-graphite-600 bg-graphite-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasDropbox ? (
        <button onClick={onSync} disabled={syncing} className={ghostBtn}>
          {syncing ? "Syncing…" : "Sync Dropbox"}
        </button>
      ) : (
        <label className={`${ghostBtn} cursor-pointer inline-flex items-center`}>
          {uploading ? "Uploading…" : "Upload photos"}
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files && onUpload(e.target.files)}
          />
        </label>
      )}
      <button
        onClick={onEnhance}
        disabled={enhancing || pending === 0}
        className="h-10 px-5 rounded-xl bg-cyan text-graphite-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-cyan/20"
      >
        {enhancing ? "Enhancing…" : pending > 0 ? `Start enhance (${pending})` : "Nothing to enhance"}
      </button>
      <button
        onClick={onDownload}
        disabled={downloading || approved === 0}
        className="h-10 px-5 rounded-xl bg-white text-graphite-950 text-sm font-semibold hover:bg-graphite-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {downloading ? "Zipping…" : `Download ZIP (${approved})`}
      </button>
    </div>
  );
}
