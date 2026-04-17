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

// Allow up to 5 minutes for AI processing
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// POST /api/jobs/:jobId/start-enhance - process the NEXT unprocessed photo.
// Called repeatedly by the client; each call processes exactly one photo.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const rateErr = await checkRate(access.userId, "enhance");
  if (rateErr) return rateErr;

  log.info("[start-enhance] received", { jobId });

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { agent: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const nextPhoto = await prisma.photo.findFirst({
      where: { jobId, status: "pending" },
      orderBy: { orderIndex: "asc" },
    });

    if (!nextPhoto) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "review" },
      });
      return NextResponse.json({ done: true });
    }

    await prisma.photo.update({
      where: { id: nextPhoto.id },
      data: { status: "processing" },
    });

    // Load bracket group files from exifData JSON
    let bracketFiles: Array<{ fileName: string; path?: string }> = [];
    try {
      const exif = nextPhoto.exifData ? JSON.parse(nextPhoto.exifData) : null;
      if (exif?.photos && Array.isArray(exif.photos)) {
        bracketFiles = exif.photos;
      }
    } catch {
      bracketFiles = [];
    }

    if (bracketFiles.length === 0 || !job.dropboxUrl) {
      await prisma.photo.update({
        where: { id: nextPhoto.id },
        data: { status: "error", errorMessage: "No bracket files or Dropbox URL" },
      });
      return NextResponse.json({ error: "No bracket files" }, { status: 400 });
    }

    try {
      // Always derive the absolute Dropbox path from the job's destination
      // folder. Whatever is in exifData.photos[n].path may be relative if the
      // row was created by the shared-link sync flow — the folderPath + name
      // construction is canonical.
      const folderPath = job.agent?.dropboxFolder
        ? `${job.agent.dropboxFolder}/${sanitizeFolderName(job.address)}`
        : `/BatchBase/_uploads/${job.id}`;

      const bracketBuffers: Array<{ buffer: Buffer; name: string }> = [];
      for (const f of bracketFiles) {
        const absolutePath = `${folderPath}/${f.fileName}`;
        let buf: Buffer;
        try {
          buf = await downloadInternalFile(absolutePath);
        } catch (dlErr: unknown) {
          log.warn("[start-enhance] internal download failed, trying shared link", {
            absolutePath,
            err: dlErr instanceof Error ? dlErr.message : String(dlErr),
          });
          buf = await downloadFileFromSharedLink(job.dropboxUrl, `/${f.fileName}`);
        }
        bracketBuffers.push({ buffer: buf, name: f.fileName });
      }

      // Real HDR merge + straightening + real-estate color via Autoenhance.ai.
      // (Per-photo preset/seasonal overrides are preserved on the Photo row
      // for future use — Autoenhance currently uses its own real-estate
      // defaults; we can map our preset keys to their presets once they
      // expose stable preset IDs in the process-order payload.)
      const result = await enhanceViaAutoenhance(bracketBuffers);

      if (!result.success) {
        await prisma.photo.update({
          where: { id: nextPhoto.id },
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
        const num = String(nextPhoto.orderIndex + 1).padStart(2, "0");
        const fileBaseName = `${addressSlug}-${num}`;
        const urls = await persistEnhancedEdit({
          imageBuffer: result.imageBuffer,
          destFolderPath,
          fileBaseName,
        });
        editedUrl = urls.editedUrl;
        thumbnailUrl = urls.thumbnailUrl;
      } catch (uploadErr) {
        log.warn("[start-enhance] dropbox upload failed, falling back to data URL", {
          err: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
        });
        editedUrl = `data:${result.mimeType};base64,${result.imageBuffer.toString("base64")}`;
      }

      await prisma.photo.update({
        where: { id: nextPhoto.id },
        data: { status: "edited", editedUrl, thumbnailUrl },
      });

      const processed = await prisma.photo.count({
        where: { jobId, status: { notIn: ["pending", "processing"] } },
      });

      await prisma.job.update({
        where: { id: jobId },
        data: { processedPhotos: processed },
      });

      return NextResponse.json({ photoId: nextPhoto.id, processed });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await prisma.photo.update({
        where: { id: nextPhoto.id },
        data: { status: "error", errorMessage: message },
      });
      log.error("[start-enhance] error", { jobId, photoId: nextPhoto.id, err: message });
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error("[start-enhance] fatal", { jobId, err: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
