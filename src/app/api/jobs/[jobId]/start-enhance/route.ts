import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enhancePhoto } from "@/lib/ai-enhance";
import { requireJobAccess } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { persistEnhancedEdit } from "@/lib/dropbox";

// Allow up to 5 minutes for AI processing
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Download a file from Dropbox shared link using raw API
async function downloadFromDropbox(sharedUrl: string, fileName: string): Promise<Buffer> {
  const token = process.env.DROPBOX_ACCESS_TOKEN;
  if (!token) throw new Error("No Dropbox token");

  const response = await fetch("https://content.dropboxapi.com/2/sharing/get_shared_link_file", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({
        url: sharedUrl,
        path: `/${fileName.toLowerCase()}`,
      }),
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Dropbox download failed: ${errText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

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
    let bracketFiles: Array<{ fileName: string }> = [];
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
      // Download all bracket images
      const buffers: Buffer[] = [];
      for (const f of bracketFiles) {
        const buf = await downloadFromDropbox(job.dropboxUrl, f.fileName);
        buffers.push(buf);
      }

      const result = await enhancePhoto(
        buffers.length === 1 ? buffers[0] : buffers,
        "image/jpeg",
        job.preset,
        nextPhoto.customInstructions ?? null,
        job.seasonalStyle ?? null,
        null
      );

      if (!result.success || !result.imageBase64) {
        await prisma.photo.update({
          where: { id: nextPhoto.id },
          data: { status: "error", errorMessage: result.error ?? "Enhance failed" },
        });
        return NextResponse.json({ error: result.error ?? "Enhance failed" }, { status: 500 });
      }

      // Store enhanced bytes in Dropbox, not the DB. Falls back to a base64
      // data URL only if Dropbox upload fails — that path is slow but keeps
      // the pipeline from hanging if creds are missing.
      let editedUrl: string;
      let thumbnailUrl: string | null = null;
      try {
        const imageBuffer = Buffer.from(result.imageBase64, "base64");
        const urls = await persistEnhancedEdit(nextPhoto.id, imageBuffer, jobId);
        editedUrl = urls.editedUrl;
        thumbnailUrl = urls.thumbnailUrl;
      } catch (uploadErr) {
        log.warn("[start-enhance] dropbox upload failed, falling back to data URL", {
          err: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
        });
        editedUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
      }

      await prisma.photo.update({
        where: { id: nextPhoto.id },
        data: { status: "review", editedUrl, thumbnailUrl },
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
