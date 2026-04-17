import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import {
  persistEnhancedEdit,
  sanitizeFolderName,
  slugifyForFilename,
  downloadInternalFile,
  downloadFileFromSharedLink,
} from "@/lib/dropbox";
import {
  createAutoenhanceOrder,
  registerAndUploadBracket,
  triggerAutoenhanceProcess,
  getOrderStatus,
  downloadAutoenhanceImage,
} from "@/lib/autoenhance";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// POST /api/jobs/:jobId/photos/:photoId/enhance
//
// Single-photo re-enhance (gear icon flow). Creates a small Autoenhance
// order with JUST this one bracket group, uses visual auto-grouping for
// consistency, polls until done, downloads, stores.
//
// Batch mode (/enhance-batch) is the default "Start Enhance" path — this
// endpoint is for the per-photo settings modal + "Save & re-enhance" UX.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const rateErr = await checkRate(access.userId, "enhance");
  if (rateErr) return rateErr;

  try {
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo || photo.jobId !== jobId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { agent: true },
    });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    let bracketFiles: Array<{ fileName: string; path?: string }> = [];
    try {
      const exif = photo.exifData ? JSON.parse(photo.exifData) : null;
      if (exif?.photos && Array.isArray(exif.photos)) bracketFiles = exif.photos;
    } catch {
      bracketFiles = [];
    }
    if (bracketFiles.length === 0) {
      return NextResponse.json({ error: "No bracket files" }, { status: 400 });
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: { status: "processing", errorMessage: null },
    });

    // Resolve destination folder deterministically from job info.
    const folderPath = job.agent?.dropboxFolder
      ? `${job.agent.dropboxFolder}/${sanitizeFolderName(job.address)}`
      : `/BatchBase/_uploads/${job.id}`;

    // Download each bracket buffer from Dropbox.
    const bracketBuffers: Array<{ buffer: Buffer; name: string }> = [];
    for (const f of bracketFiles) {
      const absolutePath = `${folderPath}/${f.fileName}`;
      let buf: Buffer;
      try {
        buf = await downloadInternalFile(absolutePath);
      } catch (err: unknown) {
        log.warn("[photo-enhance] internal download failed, trying shared link", {
          absolutePath,
          err: err instanceof Error ? err.message : String(err),
        });
        if (!job.dropboxUrl) throw err;
        buf = await downloadFileFromSharedLink(job.dropboxUrl, `/${f.fileName}`);
      }
      bracketBuffers.push({ buffer: buf, name: f.fileName });
    }

    // Mini-order: create, upload brackets, trigger, poll, download.
    const orderId = await createAutoenhanceOrder();
    for (let i = 0; i < bracketBuffers.length; i += 1) {
      const b = bracketBuffers[i];
      await registerAndUploadBracket(orderId, b.name, b.buffer);
    }
    await triggerAutoenhanceProcess(orderId);

    // Poll up to ~4 min (under Vercel's 300s) — single-photo orders
    // usually finish in 30-90s.
    let imageId: string | null = null;
    const POLL_INTERVAL_MS = 5_000;
    const MAX_ATTEMPTS = 50;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const status = await getOrderStatus(orderId);
      const done = status.is_merging === false && status.is_processing === false;
      const first = status.images?.[0];
      if (!done || !first) continue;
      if (first.error) {
        const errMsg = typeof first.error === "string" ? first.error : "Autoenhance error";
        throw new Error(errMsg);
      }
      if (first.enhanced && first.image_id) {
        imageId = first.image_id;
        break;
      }
    }
    if (!imageId) throw new Error("Autoenhance single-photo enhance timed out");

    // Download + upload to Dropbox.
    const { buffer } = await downloadAutoenhanceImage(imageId);
    const addressSlug = slugifyForFilename(job.address);
    const num = String(photo.orderIndex + 1).padStart(2, "0");
    const urls = await persistEnhancedEdit({
      imageBuffer: buffer,
      destFolderPath: folderPath,
      fileBaseName: `${addressSlug}-${num}`,
    });

    const updated = await prisma.photo.update({
      where: { id: photoId },
      data: {
        status: "edited",
        editedUrl: urls.editedUrl,
        thumbnailUrl: urls.thumbnailUrl,
        autoenhanceImageId: imageId,
        errorMessage: null,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : "Unknown error";
    const message = rawMessage.replace(/\x00/g, "").slice(0, 1000);
    log.error("[photo-enhance] error", {
      jobId,
      photoId,
      err: message,
      stack: err instanceof Error ? err.stack : undefined,
    });
    await prisma.photo
      .update({ where: { id: photoId }, data: { status: "failed", errorMessage: message } })
      .catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
