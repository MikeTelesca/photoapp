import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enhancePhoto } from "@/lib/ai-enhance";
import { requireJobAccess } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { persistEnhancedEdit, sanitizeFolderName, slugifyForFilename } from "@/lib/dropbox";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

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

// POST /api/jobs/:jobId/photos/:photoId/enhance - re-enhance a single photo
export async function POST(
  request: NextRequest,
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

    let bracketFiles: Array<{ fileName: string }> = [];
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

    const buffers: Buffer[] = [];
    for (const f of bracketFiles) {
      const buf = await downloadFromDropbox(job.dropboxUrl, f.fileName);
      buffers.push(buf);
    }

    // Per-photo overrides win over job defaults. A null override means
    // "use the job's setting".
    const effectivePreset = photo.preset ?? job.preset;
    const effectiveSeasonal = photo.seasonalStyle ?? job.seasonalStyle ?? null;

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
      photo.customInstructions ?? null,
      effectiveSeasonal,
      null,
      customPresetPrompt,
    );

    if (!result.success || !result.imageBase64) {
      await prisma.photo.update({
        where: { id: photoId },
        data: { status: "error", errorMessage: result.error ?? "Enhance failed" },
      });
      return NextResponse.json({ error: result.error ?? "Enhance failed" }, { status: 500 });
    }

    let editedUrl: string;
    let thumbnailUrl: string | null = null;
    try {
      const imageBuffer = Buffer.from(result.imageBase64, "base64");
      const destFolderPath = job.agent?.dropboxFolder
        ? `${job.agent.dropboxFolder}/${sanitizeFolderName(job.address)}`
        : `/BatchBase/_uploads/${job.id}`;
      const addressSlug = slugifyForFilename(job.address);
      const num = String(photo.orderIndex + 1).padStart(2, "0");
      const fileBaseName = `${addressSlug}-${num}`;
      const urls = await persistEnhancedEdit({
        imageBuffer,
        destFolderPath,
        fileBaseName,
      });
      editedUrl = urls.editedUrl;
      thumbnailUrl = urls.thumbnailUrl;
    } catch (uploadErr) {
      log.warn("[photo-enhance] dropbox upload failed, falling back to data URL", {
        err: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
      });
      editedUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
    }

    const updated = await prisma.photo.update({
      where: { id: photoId },
      data: { status: "review", editedUrl, thumbnailUrl },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log.error("[photo-enhance] error", { jobId, photoId, err: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
