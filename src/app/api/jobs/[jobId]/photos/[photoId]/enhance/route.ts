import { NextRequest, NextResponse } from "next/server";

// Allow up to 5 minutes for AI processing
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { enhancePhoto, convertToTwilight, analyzePhoto } from "@/lib/ai-enhance";
import { uploadToDropbox } from "@/lib/dropbox";
import { requireJobAccess } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";
import { AI_COST_PER_IMAGE } from "@/lib/pricing";
import { logActivity } from "@/lib/activity";
import { logError } from "@/lib/error-log";
import { log } from "@/lib/logger";
import { analyzeImage } from "@/lib/image-quality";
import { detectPhotoTags } from "@/lib/photo-tags";

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

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// POST /api/jobs/:jobId/photos/:photoId/enhance
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
    const body = await request.json().catch(() => ({}));
    const { customInstructions: requestCustomInstructions, makeTwilight } = body as {
      customInstructions?: string;
      makeTwilight?: boolean;
    };

    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    const job = await prisma.job.findUnique({ where: { id: jobId } });

    // Prefer photo's customPromptOverride > job's customPromptOverride > per-request customInstructions
    const customInstructions = photo?.customPromptOverride || job?.customPromptOverride || requestCustomInstructions || null;

    if (!photo || !job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: job.photographerId },
      select: { monthlyAiCostLimit: true, promptPrefix: true },
    });

    // Check monthly cost limit
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyCostResult = await prisma.job.aggregate({
      where: { photographerId: job.photographerId, createdAt: { gte: startOfMonth } },
      _sum: { cost: true },
    });
    const monthlyCost = monthlyCostResult._sum.cost || 0;

    const limit = user?.monthlyAiCostLimit ?? 50;

    if (monthlyCost + AI_COST_PER_IMAGE > limit) {
      return NextResponse.json({
        error: `Monthly AI cost limit exceeded ($${monthlyCost.toFixed(2)} / $${limit.toFixed(2)}). Contact admin to increase limit.`,
        limitExceeded: true,
      }, { status: 402 });
    }

    // Always check database for preset prompt - this lets users edit prompts in the UI
    let customPresetPrompt: string | null = null;
    const dbPreset = await prisma.preset.findFirst({ where: { slug: job.preset } });
    if (dbPreset?.promptModifiers && dbPreset.promptModifiers.trim().length > 0) {
      customPresetPrompt = dbPreset.promptModifiers;
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: { status: "processing" },
    });

    // Get all bracket exposures for HDR merge
    let imageBuffer: Buffer; // Single image used for analyzePhoto
    let bracketBuffers: Buffer[] = []; // All brackets sent to Gemini for HDR merge
    const mimeType = "image/jpeg";
    const sharp = (await import("sharp")).default;

    if (job.dropboxUrl && photo.exifData) {
      const exif = JSON.parse(photo.exifData);
      const allBracketFiles: Array<{ fileName: string }> = exif?.photos || [];
      if (allBracketFiles.length === 0) {
        return NextResponse.json({ error: "No bracket files" }, { status: 400 });
      }

      const downloaded = await Promise.all(
        allBracketFiles.map(async (f) => {
          try {
            const buf = await downloadFromDropbox(job.dropboxUrl!, f.fileName);
            return await sharp(buf)
              .resize(1536, 1536, { fit: "inside", withoutEnlargement: true })
              .jpeg({ quality: 88 })
              .toBuffer();
          } catch {
            return null;
          }
        })
      );
      bracketBuffers = downloaded.filter((b): b is Buffer => b !== null);

      if (bracketBuffers.length === 0) {
        return NextResponse.json({ error: "Failed to download brackets" }, { status: 500 });
      }

      imageBuffer = bracketBuffers[Math.floor(bracketBuffers.length / 2)];
    } else if (photo.originalUrl && photo.originalUrl.startsWith("http")) {
      const response = await fetch(photo.originalUrl);
      imageBuffer = Buffer.from(await response.arrayBuffer());
      bracketBuffers = [imageBuffer];
    } else {
      return NextResponse.json({ error: "No source image" }, { status: 400 });
    }

    let result;

    if (makeTwilight) {
      const twilightStyle = photo.twilightStyle || "warm-dusk";
      result = await convertToTwilight(bracketBuffers, mimeType, photo.isExterior, customInstructions, twilightStyle);
    } else {
      // Analyze photo for detections
      if (!photo.detections || photo.detections === "[]") {
        const analysis = await analyzePhoto(imageBuffer, mimeType);
        await prisma.photo.update({
          where: { id: photoId },
          data: {
            isExterior: analysis.isExterior,
            detections: JSON.stringify(analysis.detections),
          },
        });
      }

      // Build TV instruction based on job's tvStyle
      const tvInstructions: Record<string, string> = {
        netflix: "If there's a TV, replace the screen with a Netflix home screen showing movie thumbnails and the Netflix UI (red logo, rows of movie posters, dark background).",
        black: "If there's a TV, make the screen completely black/off - a turned off TV with a dark, reflective screen.",
        beach: "If there's a TV, replace the screen with a beautiful tropical beach scene - blue water, white sand, palm trees.",
        mountains: "If there's a TV, replace the screen with a scenic mountain landscape - snow-capped peaks, green valleys.",
        fireplace: "If there's a TV, replace the screen with a cozy crackling fireplace video - warm orange flames.",
        art: "If there's a TV, replace the screen with modern abstract artwork - colorful, tasteful, gallery-quality.",
        off: "Leave any TV screens exactly as they are - do not modify TV screens at all.",
      };
      const tvInstruction = tvInstructions[job.tvStyle || "netflix"] || tvInstructions.netflix;

      // Build Sky instruction — "as-is" default to prevent AI hallucinating sky/scenery
      const skyInstructions: Record<string, string> = {
        "blue-clouds": "SKY ONLY: You MAY replace ONLY the sky pixels (above rooflines/horizon) with clear blue sky and scattered white clouds. ABSOLUTE: NEVER touch ground, dirt, driveways, lawns, or anything else. NEVER add grass where there is dirt.",
        "clear-blue": "SKY ONLY: You MAY replace ONLY the sky pixels with pure clear blue sky. ABSOLUTE: NEVER touch ground, dirt, driveways, grass.",
        "golden-hour": "SKY ONLY: You MAY replace ONLY the sky pixels with a warm golden hour sky. ABSOLUTE: NEVER touch ground, dirt, driveways, grass.",
        "dramatic": "SKY ONLY: You MAY replace ONLY the sky pixels with a dramatic deep blue sky with bold clouds. ABSOLUTE: NEVER touch ground, dirt, driveways, grass.",
        "overcast-soft": "Do NOT modify the sky.",
        "as-is": "Do NOT modify or replace the sky. Keep the original sky exactly as it appears.",
      };
      // CRITICAL: only apply sky instruction to EXTERIOR photos
      const isExt = photo.isExterior;
      const skyInstruction = isExt
        ? (skyInstructions[job.skyStyle || "as-is"] || skyInstructions["as-is"])
        : "INTERIOR PHOTO: Do NOT replace, modify, or add anything to windows, sky areas, or anything visible through glass. Do NOT add clouds, sky, grass, trees, or scenery. Keep all windows EXACTLY as they appear.";

      const hdrInstruction = bracketBuffers.length > 1
        ? `HDR MERGE: The ${bracketBuffers.length} input images above are bracketed exposures of the SAME scene. Merge them into a single HDR image — recover highlights from under-exposed bracket, recover shadows from over-exposed bracket, use middle as tonal foundation. Output a SINGLE merged photo, not a collage. Same camera angle, framing, and content.`
        : "";

      const additionalInstructions = [hdrInstruction, tvInstruction, skyInstruction].filter(Boolean);
      if (customInstructions) additionalInstructions.push(customInstructions);
      const combinedInstructions = additionalInstructions.join("\n");

      result = await enhancePhoto(bracketBuffers, mimeType, job.preset, customPresetPrompt ? `${customPresetPrompt}\n\n${combinedInstructions}` : combinedInstructions, job.seasonalStyle, user?.promptPrefix);
    }

    if (!result.success) {
      log.error("[enhance] failed", { jobId, photoId, error: result.error });
      await prisma.photo.update({
        where: { id: photoId },
        data: {
          status: "pending",
          errorMessage: result.error || "Unknown error",
          errorAttempts: { increment: 1 },
          retryCount: { increment: 1 },
        },
      });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Store edited image - upscale to 4K if AI returned smaller (sharp already imported above)
    const aiOutputBuffer = Buffer.from(result.imageBase64!, "base64");
    const aiMeta = await sharp(aiOutputBuffer).metadata();
    const aiWidth = aiMeta.width || 1024;
    const TARGET_WIDTH = 3840;

    let outputBuffer: Buffer;
    if (aiWidth >= TARGET_WIDTH) {
      outputBuffer = await sharp(aiOutputBuffer).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    } else {
      const aspectRatio = (aiMeta.height || 768) / aiWidth;
      const targetHeight = Math.round(TARGET_WIDTH * aspectRatio);
      outputBuffer = await sharp(aiOutputBuffer)
        .resize(TARGET_WIDTH, targetHeight, { kernel: "lanczos3", fit: "fill" })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
    }

    const sanitizedAddress = job.address.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);
    const editedFileName = `photo_${photo.orderIndex + 1}.jpg`;
    const dropboxPath = `/PhotoApp/edited/${sanitizedAddress}_${job.id.substring(0, 8)}/${editedFileName}`;

    // Upload with retry
    let editedUrl: string | null = null;
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        editedUrl = await uploadToDropbox(outputBuffer, dropboxPath);
        break;
      } catch (err) {
        lastError = err as Error;
        console.error(`Upload attempt ${attempt + 1} failed:`, err);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    if (!editedUrl) {
      const uploadErr = `Dropbox upload failed after 3 attempts: ${lastError?.message}`;
      log.error("[enhance] upload failed", { jobId, photoId, error: uploadErr });
      // Mark photo as pending again, don't bill
      await prisma.photo.update({
        where: { id: photoId },
        data: {
          status: "pending",
          errorMessage: uploadErr,
          errorAttempts: { increment: 1 },
          retryCount: { increment: 1 },
        },
      });
      return NextResponse.json({
        error: uploadErr,
        photoId,
      }, { status: 500 });
    }

    log.info("[enhance] completed", { jobId, photoId });

    // Analyze quality of enhanced output (non-blocking — failure never breaks enhance flow)
    let qualityFlags: string | null = null;
    try {
      const flags = await analyzeImage(outputBuffer);
      qualityFlags = JSON.stringify(flags);
    } catch (qErr) {
      console.warn("[enhance] quality analysis failed (non-fatal):", qErr);
    }

    // Save old edited URL as a version before overwriting
    if (photo.editedUrl) {
      await prisma.photoVersion.create({
        data: {
          photoId: photo.id,
          url: photo.editedUrl,
          preset: job.preset,
        },
      }).catch(err => console.error("version save err:", err));
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: {
        editedUrl,
        status: "edited",
        errorMessage: null,
        errorAttempts: 0,
        retryCount: 0,
        customInstructions: customInstructions || null,
        isTwilight: makeTwilight || photo.isTwilight,
        qualityFlags,
      },
    });

    // Fire-and-forget auto-tagging — does not block enhance completion
    if (editedUrl) {
      detectPhotoTags(editedUrl).then(async (tags) => {
        if (tags.length > 0) {
          await prisma.photo.update({
            where: { id: photoId },
            data: { autoTags: JSON.stringify(tags) },
          }).catch(err => console.error("autoTags save err:", err));
        }
      }).catch(() => {});
    }

    await logActivity({
      type: "photo_regenerated",
      message: makeTwilight ? `Photo regenerated as twilight` : `Photo regenerated`,
      jobId: jobId,
      photoId: photoId,
      userId: access.userId,
    });

    // Track cost
    await prisma.job.update({
      where: { id: jobId },
      data: { cost: { increment: AI_COST_PER_IMAGE } },
    });

    return NextResponse.json({ success: true, photoId, editedUrl });
  } catch (error: unknown) {
    const err = error as Error;
    log.error("[enhance] failed", { jobId, photoId, error: err.message });
    await logError({
      source: "enhance",
      message: err.message || "Unknown error during photo enhancement",
      jobId,
      photoId,
    });
    await prisma.photo.update({
      where: { id: photoId },
      data: {
        status: "pending",
        errorMessage: err.message || "Unknown error",
        errorAttempts: { increment: 1 },
        retryCount: { increment: 1 },
      },
    }).catch(() => {});
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
