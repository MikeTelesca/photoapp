import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enhancePhoto } from "@/lib/ai-enhance";
import { requireJobAccess } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import {
  persistEnhancedEdit,
  sanitizeFolderName,
  slugifyForFilename,
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
        const buf = await downloadFileFromSharedLink(job.dropboxUrl, `/${f.fileName}`);
        buffers.push(buf);
      }

      // Per-photo overrides win over job defaults. A null override means
      // "use the job's setting".
      const effectivePreset = nextPhoto.preset ?? job.preset;
      const effectiveSeasonal = nextPhoto.seasonalStyle ?? job.seasonalStyle ?? null;

      // If the preset isn't a built-in, see if the photographer has a user
      // preset matching this slug and pass the prompt through.
      let customPresetPrompt: string | null = null;
      const BUILTIN_PRESETS = ["standard", "bright-airy", "flambient-hdr", "mls-standard", "flambient"];
      if (!BUILTIN_PRESETS.includes(effectivePreset)) {
        const userPreset = await prisma.preset.findUnique({
          where: { photographerId_slug: { photographerId: access.userId, slug: effectivePreset } },
        });
        if (userPreset) customPresetPrompt = userPreset.prompt;
      }

      const result = await enhancePhoto(
        buffers.length === 1 ? buffers[0] : buffers,
        "image/jpeg",
        effectivePreset,
        nextPhoto.customInstructions ?? null,
        effectiveSeasonal,
        null,
        customPresetPrompt,
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
        const destFolderPath = job.agent?.dropboxFolder
          ? `${job.agent.dropboxFolder}/${sanitizeFolderName(job.address)}`
          : `/BatchBase/_uploads/${job.id}`;
        const addressSlug = slugifyForFilename(job.address);
        const num = String(nextPhoto.orderIndex + 1).padStart(2, "0");
        const fileBaseName = `${addressSlug}-${num}`;
        const urls = await persistEnhancedEdit({
          imageBuffer,
          destFolderPath,
          fileBaseName,
        });
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
