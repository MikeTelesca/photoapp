import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enhanceViaAutoenhance } from "@/lib/autoenhance";
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

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// POST /api/jobs/:jobId/photos/:photoId/enhance - re-enhance a single photo
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
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!job.dropboxUrl) {
      return NextResponse.json({ error: "Job has no Dropbox URL" }, { status: 400 });
    }

    let bracketFiles: Array<{ fileName: string; path?: string }> = [];
    try {
      const exif = photo.exifData ? JSON.parse(photo.exifData) : null;
      if (exif?.photos && Array.isArray(exif.photos)) {
        bracketFiles = exif.photos;
      }
    } catch {
      bracketFiles = [];
    }

    if (bracketFiles.length === 0) {
      return NextResponse.json({ error: "No bracket files" }, { status: 400 });
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: { status: "processing" },
    });

    // Derive the absolute Dropbox path for each bracket. We always know the
    // job's destination folder (agent's property folder, or fallback), so we
    // construct the absolute path from that + the filename — ignoring
    // whatever was stored in exifData.photos[n].path, which may be relative
    // to a shared-link context for rows created by the sync path.
    const folderPath = job.agent?.dropboxFolder
      ? `${job.agent.dropboxFolder}/${sanitizeFolderName(job.address)}`
      : `/BatchBase/_uploads/${job.id}`;

    const bracketBuffers: Array<{ buffer: Buffer; name: string }> = [];
    for (const f of bracketFiles) {
      const absolutePath = `${folderPath}/${f.fileName}`;
      let buf: Buffer;
      try {
        buf = await downloadInternalFile(absolutePath);
      } catch (err: unknown) {
        // Fallback: try the shared-link path before giving up. Keeps legacy
        // ingests from external Dropbox links working.
        log.warn("[photo-enhance] internal download failed, trying shared link", {
          absolutePath,
          err: err instanceof Error ? err.message : String(err),
        });
        buf = await downloadFileFromSharedLink(job.dropboxUrl, `/${f.fileName}`);
      }
      bracketBuffers.push({ buffer: buf, name: f.fileName });
    }

    // Real HDR merge + straightening + real-estate color via Autoenhance.ai
    const result = await enhanceViaAutoenhance(bracketBuffers);

    if (!result.success) {
      await prisma.photo.update({
        where: { id: photoId },
        data: { status: "failed", errorMessage: result.error },
      });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    let editedUrl: string;
    let thumbnailUrl: string | null = null;
    try {
      const destFolderPath = job.agent?.dropboxFolder
        ? `${job.agent.dropboxFolder}/${sanitizeFolderName(job.address)}`
        : `/BatchBase/_uploads/${job.id}`;
      const addressSlug = slugifyForFilename(job.address);
      const num = String(photo.orderIndex + 1).padStart(2, "0");
      const fileBaseName = `${addressSlug}-${num}`;
      const urls = await persistEnhancedEdit({
        imageBuffer: result.imageBuffer,
        destFolderPath,
        fileBaseName,
      });
      editedUrl = urls.editedUrl;
      thumbnailUrl = urls.thumbnailUrl;
    } catch (uploadErr) {
      log.warn("[photo-enhance] dropbox upload failed, falling back to data URL", {
        err: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
      });
      editedUrl = `data:${result.mimeType};base64,${result.imageBuffer.toString("base64")}`;
    }

    const updated = await prisma.photo.update({
      where: { id: photoId },
      data: { status: "edited", editedUrl, thumbnailUrl },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    log.error("[photo-enhance] error", { jobId, photoId, err: message, stack });
    await prisma.photo
      .update({ where: { id: photoId }, data: { status: "failed", errorMessage: message } })
      .catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
