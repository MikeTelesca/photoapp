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
import { JobSettingsModal } from "@/components/jobs/job-settings-modal";

export type JobSummary = {
  id: string;
  address: string;
  status: string;
  dropboxUrl: string | null;
  preset: string;
  tvStyle: string;
  skyStyle: string;
  seasonalStyle: string | null;
  agentId: string | null;
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
  const [jobSettingsOpen, setJobSettingsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [enhanceStatus, setEnhanceStatus] = useState<{
    phase: "uploading" | "merging" | "processing" | "downloading" | "done" | "idle";
    total: number;
    ready: number;
    failed: number;
    lastTick: number;
  } | null>(null);
  const [error, setError] = useState("");

  const counts = useMemo(() => {
    let approved = 0;
    let rejected = 0;
    let pending = 0;
    let edited = 0;
    let processing = 0;
    let failed = 0;
    for (const p of photos) {
      if (p.status === "approved") approved += 1;
      else if (p.status === "rejected") rejected += 1;
      else if (p.status === "edited") edited += 1;
      else if (p.status === "processing" || p.status === "regenerating") processing += 1;
      else if (p.status === "failed" || p.status === "error") failed += 1;
      else pending += 1;
    }
    const total = photos.length;
    const done = approved + rejected;
    const percent = total > 0 ? Math.round(((approved + edited) / total) * 100) : 0;
    return { total, approved, rejected, pending, edited, processing, failed, done, percent };
  }, [photos]);

  const failedCount = counts.failed;

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

  // Batch enhance: kick off one Autoenhance order for the whole job, then
  // poll every 10s until it's done. Consistent colour/tone across the
  // listing, and Autoenhance's visual AI handles bracket grouping so
  // mixed brackets + drones can't get slammed together.
  const startEnhance = useCallback(async () => {
    setEnhancing(true);
    setError("");
    // Ask the browser for notification permission on first Start Enhance
    // so we can ping the user when it finishes even if they've tabbed away.
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        void Notification.requestPermission();
      }
    }
    // Optimistically paint an "uploading" banner IMMEDIATELY so the user
    // isn't staring at a dead UI during the 60-90s /enhance-batch call.
    const pendingCount = photos.filter((p) => p.status === "pending" || p.status === "failed").length;
    setEnhanceStatus({
      phase: "uploading",
      total: pendingCount,
      ready: 0,
      failed: 0,
      lastTick: Date.now(),
    });
    try {
      const res = await fetch(`/api/jobs/${initialJob.id}/enhance-batch`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const serverMsg =
          body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : null;
        throw new Error(serverMsg ?? `Enhance failed (HTTP ${res.status})`);
      }
      await reloadPhotos();
      // The polling effect (below) takes over from here — it watches for
      // any "processing" photos and hits /enhance-poll until all land.
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Enhance failed");
      setEnhancing(false);
      await reloadPhotos();
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

  // Pulls already-enhanced outputs from an existing Autoenhance order and
  // distributes them to Photo rows. Useful when a bug marked photos as
  // failed even though Autoenhance actually delivered them.
  const [recovering, setRecovering] = useState(false);
  const recoverFromAutoenhance = useCallback(async () => {
    setRecovering(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${initialJob.id}/recover-from-autoenhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : null;
        throw new Error(msg ?? `Recovery failed (HTTP ${res.status})`);
      }
      const result = (await res.json()) as {
        downloaded?: number;
        matched?: number;
        failed?: number;
      };
      await reloadPhotos();
      if ((result.downloaded ?? 0) === 0) {
        setError(`No outputs recovered — Autoenhance had no matching images.`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Recovery failed");
    } finally {
      setRecovering(false);
    }
  }, [initialJob.id, reloadPhotos]);

  // One-click retry for every photo that errored out. Flips their status
  // back to "pending" + calls enhance-batch which will pick them up
  // alongside any remaining pending photos.
  const retryFailed = useCallback(async () => {
    setError("");
    const failed = photos.filter((p) => p.status === "failed");
    if (failed.length === 0) return;
    const prev = photos;
    setPhotos((ps) =>
      ps.map((p) => (p.status === "failed" ? { ...p, status: "pending", errorMessage: null } : p)),
    );
    try {
      await Promise.all(
        failed.map((p) =>
          fetch(`/api/jobs/${initialJob.id}/photos/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "pending" }),
          }),
        ),
      );
      // Now fire enhance-batch — will include these newly-resurrected photos.
      await startEnhance();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Retry failed");
      setPhotos(prev);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJob.id, photos, startEnhance]);

  // Bulk helpers — approve/reject every photo that isn't already at that
  // status (skip pending/processing so you don't accidentally approve an
  // un-enhanced shot). Optimistic + one request per photo, in parallel.
  const bulkSetStatus = useCallback(
    async (targetStatus: "approved" | "rejected") => {
      setError("");
      const targets = photos.filter(
        (p) => p.status !== targetStatus && (p.status === "edited" || p.status === "approved" || p.status === "rejected"),
      );
      if (targets.length === 0) return;
      const prev = photos;
      setPhotos((ps) =>
        ps.map((p) =>
          targets.some((t) => t.id === p.id) ? { ...p, status: targetStatus } : p,
        ),
      );
      try {
        await Promise.all(
          targets.map((p) =>
            fetch(`/api/jobs/${initialJob.id}/photos/${p.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: targetStatus }),
            }),
          ),
        );
        await reloadPhotos();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Bulk update failed");
        setPhotos(prev);
      }
    },
    [initialJob.id, photos, reloadPhotos],
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
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const serverMsg =
            body && typeof body === "object" && "error" in body
              ? String((body as { error: unknown }).error)
              : null;
          throw new Error(serverMsg ?? `Delete failed (HTTP ${res.status})`);
        }
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

  // Auto-refresh while anything is processing + batch-poll Autoenhance.
  // Two things happen on each interval:
  //   1. Hit /enhance-poll which drains ready Autoenhance outputs into
  //      Dropbox + updates Photo rows (server-side work).
  //   2. Reload photos list so the grid reflects the updates.
  useEffect(() => {
    if (counts.processing === 0 && !enhancing) return;
    let cancelled = false;

    async function tick(): Promise<void> {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/jobs/${initialJob.id}/enhance-poll`, {
          method: "POST",
          cache: "no-store",
        });
        if (res.ok) {
          const body = (await res.json()) as {
            status?: "idle" | "uploading" | "merging" | "processing" | "downloading" | "done";
            progress?: { total?: number; ready?: number; failed?: number };
          };
          if (!cancelled && body.status) {
            setEnhanceStatus({
              phase: body.status,
              total: body.progress?.total ?? 0,
              ready: body.progress?.ready ?? 0,
              failed: body.progress?.failed ?? 0,
              lastTick: Date.now(),
            });
          }
          if (body.status === "done" && !cancelled) {
            setEnhancing(false);
            // Ping the user via Web Notifications so they know it's done
            // even if they've tabbed away. Silent no-op if permission denied.
            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              try {
                const ready = body.progress?.ready ?? 0;
                const total = body.progress?.total ?? 0;
                const failed = body.progress?.failed ?? 0;
                new Notification("BatchBase — enhance complete", {
                  body:
                    failed > 0
                      ? `${ready}/${total} photos ready · ${failed} failed`
                      : `${ready} photos ready at ${initialJob.address}`,
                  tag: `enhance-done-${initialJob.id}`,
                });
              } catch {
                /* some browsers throw for bad tags / cross-origin */
              }
            }
            // Keep status visible for a moment so the user sees the final state
            // before it fades out.
            setTimeout(() => {
              if (!cancelled) setEnhanceStatus(null);
            }, 3500);
          }
        }
      } catch {
        /* transient — next tick will retry */
      }
      if (!cancelled) await reloadPhotos();
    }

    // Kick immediately then every 10s — enhance-poll does real work so
    // don't hammer it every few seconds.
    void tick();
    const id = setInterval(() => {
      void tick();
    }, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [counts.processing, enhancing, initialJob.id, reloadPhotos]);

  // Dynamic page title: shows progress in the browser tab so the user can
  // watch it from another tab without flipping back.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const base = initialJob.address || "Job";
    if (enhancing && enhanceStatus) {
      const { phase, ready, total } = enhanceStatus;
      const label =
        phase === "uploading"
          ? "Uploading"
          : phase === "merging"
            ? "Grouping"
            : phase === "processing"
              ? total > 0
                ? `${ready}/${total} done`
                : "Enhancing"
              : phase === "downloading"
                ? `${ready}/${total} ready`
                : phase === "done"
                  ? "Done"
                  : "Working";
      document.title = `[${label}] ${base} — BatchBase`;
    } else {
      document.title = `${base} — BatchBase`;
    }
    return () => {
      document.title = "BatchBase";
    };
  }, [enhancing, enhanceStatus, initialJob.address]);

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
          <button
            type="button"
            onClick={() => setJobSettingsOpen(true)}
            className="h-8 px-3 rounded-lg text-[13px] font-medium text-graphite-400 hover:text-white hover:bg-graphite-900 transition inline-flex items-center gap-1.5"
            title="Edit job settings"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M7 1v2M7 11v2M1 7h2M11 7h2M2.5 2.5l1.4 1.4M10.1 10.1l1.4 1.4M2.5 11.5l1.4-1.4M10.1 3.9l1.4-1.4"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            Settings
          </button>
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

        {/* Live enhance status banner — only visible while enhancing */}
        {(enhancing || enhanceStatus) && enhanceStatus && enhanceStatus.phase !== "idle" && (
          <EnhanceStatusBanner status={enhanceStatus} />
        )}

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

          {(counts.edited > 0 || counts.rejected > 0 || failedCount > 0) && (
            <div className="mt-5 flex flex-wrap items-center gap-2 pt-5 border-t border-graphite-800">
              <span className="text-[11px] uppercase tracking-[0.2em] text-graphite-500 mr-1">
                Bulk actions
              </span>
              {(counts.edited > 0 || counts.rejected > 0) && (
                <button
                  type="button"
                  onClick={() => void bulkSetStatus("approved")}
                  disabled={counts.edited === 0 && counts.rejected === 0}
                  className="h-8 px-3 rounded-lg text-[13px] font-medium border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Approve all ({counts.edited + counts.rejected})
                </button>
              )}
              {(counts.edited > 0 || counts.approved > 0) && (
                <button
                  type="button"
                  onClick={() => void bulkSetStatus("rejected")}
                  disabled={counts.edited === 0 && counts.approved === 0}
                  className="h-8 px-3 rounded-lg text-[13px] font-medium border border-red-500/30 bg-red-500/5 text-red-300 hover:bg-red-500/15 hover:border-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Reject all ({counts.edited + counts.approved})
                </button>
              )}
              {failedCount > 0 && (
                <button
                  type="button"
                  onClick={() => void recoverFromAutoenhance()}
                  disabled={enhancing || recovering}
                  title="Pulls already-enhanced outputs from Autoenhance — no new credits spent"
                  className="h-8 px-3 rounded-lg text-[13px] font-medium border border-cyan/40 bg-cyan/10 text-cyan hover:bg-cyan/20 hover:border-cyan disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {recovering ? "Recovering…" : `Recover ${failedCount} from Autoenhance`}
                </button>
              )}
              {failedCount > 0 && (
                <button
                  type="button"
                  onClick={() => void retryFailed()}
                  disabled={enhancing || recovering}
                  title="Re-runs these photos through Autoenhance (uses credits)"
                  className="h-8 px-3 rounded-lg text-[13px] font-medium border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Retry {failedCount} (uses credits)
                </button>
              )}
            </div>
          )}
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

      {jobSettingsOpen && (
        <JobSettingsModal
          jobId={initialJob.id}
          initialAddress={initialJob.address}
          initialPreset={initialJob.preset}
          initialTvStyle={initialJob.tvStyle}
          initialSkyStyle={initialJob.skyStyle}
          initialSeasonalStyle={initialJob.seasonalStyle}
          initialAgentId={initialJob.agentId}
          initialAgentName={initialJob.agentName}
          onClose={() => setJobSettingsOpen(false)}
          onSaved={() => router.refresh()}
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

// Rotating pools of playful status lines per phase. Picked real estate &
// photo editing motifs so it feels on-brand, not generic loading spinner.
const UPLOADING_LINES = [
  "Teaching the AI your address…",
  "Wrangling your brackets into a tidy pile…",
  "Convincing Dropbox to hand over the RAWs…",
  "Stacking exposures like flapjacks…",
  "Loading pixels into the cannon…",
  "Paying the toll at the Autoenhance gate…",
];

const MERGING_LINES = [
  "Autoenhance is pairing up your bracket twins…",
  "Figuring out which shots belong to the same room…",
  "Asking the photos to please stand in groups…",
  "Sorting exposures by family resemblance…",
  "Combobulating the bracket sets…",
];

const PROCESSING_LINES = [
  "Straightening the walls…",
  "Banishing the photographer from the mirror…",
  "Whispering sweet nothings to the highlights…",
  "Explaining flambient to the photons…",
  "Convincing the TV to show Netflix…",
  "Gently asking the sun to move slightly left…",
  "Pulling highlights back from the window abyss…",
  "Reminding the grass it's supposed to be green…",
  "Bribing the shadows to lift a little…",
  "Reading the histogram bedtime stories…",
  "Training the AI on what 'cozy' means…",
  "Hiding your car keys from the reflection…",
  "Evicting the ghosts from the hallway…",
  "Adding 'golden hour' to the sky's to-do list…",
  "Sending the HDR merge to finishing school…",
  "Asking the kitchen tile to behave…",
  "Calibrating the Fresnel of the Fresnel…",
  "Coaxing the chandelier into cooperating…",
];

const DOWNLOADING_LINES = [
  "Ferrying finished photos home to Dropbox…",
  "Unboxing your enhanced shots…",
  "Filing photos alphabetically by vibe…",
  "Wrapping each photo in bubble wrap…",
  "Hand-delivering to the agent's folder…",
];

const DONE_LINES = [
  "All done. Go make someone's listing look expensive.",
  "Fresh out of the oven. Review below.",
  "Shiny, straight, and ready for MLS.",
  "Photos enhanced. Agents rejoicing.",
];

function EnhanceStatusBanner({
  status,
}: {
  status: {
    phase: "uploading" | "merging" | "processing" | "downloading" | "done" | "idle";
    total: number;
    ready: number;
    failed: number;
    lastTick: number;
  };
}) {
  const { phase, total, ready, failed } = status;
  const pct = total > 0 ? Math.round((ready / total) * 100) : 0;

  // Rotate the fun line every ~4.5s while the phase stays the same.
  const [lineIdx, setLineIdx] = useState(0);
  useEffect(() => {
    setLineIdx((i) => i + 1); // bump on phase change so the new pool starts fresh
    const id = setInterval(() => setLineIdx((i) => i + 1), 4500);
    return () => clearInterval(id);
  }, [phase]);

  function pickLine(pool: string[]): string {
    return pool[lineIdx % pool.length];
  }

  const phaseCopy: Record<
    typeof phase,
    { title: string; subtitle: string; tone: string }
  > = {
    idle: { title: "Idle", subtitle: "Nothing in flight", tone: "graphite" },
    uploading: {
      title: pickLine(UPLOADING_LINES),
      subtitle:
        "First pass always takes a minute — we're pushing your source brackets up to Autoenhance.",
      tone: "cyan",
    },
    merging: {
      title: pickLine(MERGING_LINES),
      subtitle:
        "Autoenhance's visual AI is clustering shots from the same scene before the enhance pass.",
      tone: "cyan",
    },
    processing: {
      title: pickLine(PROCESSING_LINES),
      subtitle:
        total > 0
          ? `${ready} of ${total} done — ~30-60 seconds per scene. You can close this tab; we'll keep going.`
          : "Working on your bracket set. You can close this tab; we'll keep going.",
      tone: "cyan",
    },
    downloading: {
      title: pickLine(DOWNLOADING_LINES),
      subtitle: `${ready} of ${total} ready — landing in your Dropbox folder under /Edited/.`,
      tone: "emerald",
    },
    done: {
      title: pickLine(DONE_LINES),
      subtitle:
        failed > 0
          ? `${ready} enhanced, ${failed} failed — check the grid for the ones that errored.`
          : `${ready} photos enhanced. Review them below.`,
      tone: "emerald",
    },
  };
  const copy = phaseCopy[phase];
  const accent = copy.tone === "emerald" ? "emerald" : "cyan";

  const ringCls = accent === "emerald" ? "ring-emerald-500/30" : "ring-cyan/30";
  const barCls =
    accent === "emerald"
      ? "bg-gradient-to-r from-emerald-500 to-emerald-300"
      : "bg-gradient-to-r from-cyan to-emerald-400";
  const dotCls = accent === "emerald" ? "bg-emerald-400" : "bg-cyan animate-pulse";
  const textCls = accent === "emerald" ? "text-emerald-300" : "text-cyan";

  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-graphite-900 via-graphite-900 to-graphite-950 ring-1 ${ringCls} p-5 sm:p-6`}
    >
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.12),transparent_55%)]" />
      <div className="relative flex items-start gap-4">
        <span className={`w-2 h-2 rounded-full mt-2 ${dotCls}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`text-[10px] uppercase tracking-[0.25em] font-semibold ${textCls}`}>
              {phase === "done" ? "Complete" : "In progress"}
            </span>
            {total > 0 && (
              <span className="text-[11px] text-graphite-500 tabular-nums">
                {ready}/{total}
                {failed > 0 && <span className="text-red-300"> · {failed} failed</span>}
              </span>
            )}
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight mt-1">
            {copy.title}
          </h3>
          <p className="text-sm text-graphite-400 mt-1 leading-relaxed">{copy.subtitle}</p>

          {total > 0 && (
            <div className="relative h-1.5 rounded-full bg-graphite-950 overflow-hidden mt-4">
              <div
                className={`absolute inset-y-0 left-0 ${barCls} transition-all duration-700 ease-out`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
