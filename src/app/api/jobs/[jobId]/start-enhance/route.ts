import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enhancePhoto, analyzePhoto } from "@/lib/ai-enhance";
import { uploadToDropbox } from "@/lib/dropbox";
import { requireJobAccess } from "@/lib/api-auth";
import { AI_COST_PER_IMAGE } from "@/lib/pricing";
import { logActivity } from "@/lib/activity";

// Allow up to 5 minutes for AI processing (model cascade + retries)
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

// POST /api/jobs/:jobId/start-enhance - process the NEXT unprocessed photo
// Called repeatedly by the client; each call processes exactly one photo.
// If the client navigates away, re-opening the page resumes by calling again.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check monthly cost limit
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyCostResult = await prisma.job.aggregate({
      where: { photographerId: job.photographerId, createdAt: { gte: startOfMonth } },
      _sum: { cost: true },
    });
    const monthlyCost = monthlyCostResult._sum.cost || 0;

    const user = await prisma.user.findUnique({ where: { id: job.photographerId } });
    const limit = (user as any)?.monthlyAiCostLimit ?? 50;

    if (monthlyCost + AI_COST_PER_IMAGE > limit) {
      return NextResponse.json({
        error: `Monthly AI cost limit exceeded ($${monthlyCost.toFixed(2)} / $${limit.toFixed(2)}). Contact admin to increase limit.`,
        limitExceeded: true,
      }, { status: 402 });
    }

    // Atomic claim - race-safe
    const claimed = await prisma.$transaction(async (tx) => {
      const candidate = await tx.photo.findFirst({
        where: { jobId, status: "pending" },
        orderBy: { orderIndex: "asc" },
      });
      if (!candidate) return null;

      // Atomic conditional update - only succeeds if status is still "pending"
      const updated = await tx.photo.updateMany({
        where: { id: candidate.id, status: "pending" },
        data: { status: "processing" },
      });

      if (updated.count === 0) return null; // Another worker won the race
      return candidate;
    });

    if (!claimed) {
      // No more pending photos, or race lost - check again
      const remaining = await prisma.photo.count({ where: { jobId, status: "pending" } });
      if (remaining === 0) {
        // All done
        const totalEdited = await prisma.photo.count({
          where: { jobId, status: { in: ["edited", "approved"] } },
        });
        await prisma.job.update({
          where: { id: jobId },
          data: { status: "review", processedPhotos: totalEdited },
        });
        return NextResponse.json({ done: true, processed: totalEdited });
      }
      // Race lost, tell client to retry
      return NextResponse.json({ done: false, remaining, retry: true });
    }

    const photo = claimed;

    // Get source image
    if (!job.dropboxUrl || !photo.exifData) {
      await prisma.photo.update({ where: { id: photo.id }, data: { status: "pending" } });
      return NextResponse.json({ error: "No source data", skipped: true });
    }

    const exif = JSON.parse(photo.exifData);
    const allBracketFiles: Array<{ fileName: string }> = exif?.photos || [];
    if (allBracketFiles.length === 0) {
      await prisma.photo.update({ where: { id: photo.id }, data: { status: "pending" } });
      return NextResponse.json({ error: "No bracket files in exif", skipped: true });
    }

    // Download ALL brackets in parallel for HDR merge
    const sharp = (await import("sharp")).default;
    const bracketBuffers = await Promise.all(
      allBracketFiles.map(async (f) => {
        try {
          const buf = await downloadFromDropbox(job.dropboxUrl!, f.fileName);
          // Resize each bracket to ~1536px on long side to keep prompt size manageable
          // (Gemini accepts large images but cost/latency scales with input size)
          return await sharp(buf)
            .resize(1536, 1536, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 88 })
            .toBuffer();
        } catch (err) {
          console.error(`[hdr] Failed to download bracket ${f.fileName}:`, err);
          return null;
        }
      })
    );
    const validBrackets = bracketBuffers.filter((b): b is Buffer => b !== null);

    if (validBrackets.length === 0) {
      await prisma.photo.update({ where: { id: photo.id }, data: { status: "pending" } });
      return NextResponse.json({ error: "Could not download any brackets", skipped: true });
    }

    // Use middle bracket for analysis (it's typically the best-exposed for scene detection)
    const middleIdx = Math.floor(validBrackets.length / 2);
    const imageBuffer = validBrackets[middleIdx];
    const mimeType = "image/jpeg";

    console.log(`[hdr] Downloaded ${validBrackets.length}/${allBracketFiles.length} brackets for HDR merge`);

    // Analyze photo for detections
    const analysis = await analyzePhoto(imageBuffer, mimeType);
    await prisma.photo.update({
      where: { id: photo.id },
      data: {
        isExterior: analysis.isExterior,
        detections: JSON.stringify(analysis.detections),
      },
    });

    // Load preset prompt from database (user-editable)
    let customPresetPrompt: string | null = null;
    const dbPreset = await prisma.preset.findFirst({ where: { slug: job.preset } });
    if (dbPreset?.promptModifiers && dbPreset.promptModifiers.trim().length > 0) {
      customPresetPrompt = dbPreset.promptModifiers;
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
    const tvInstruction = tvInstructions[(job as any).tvStyle || "netflix"] || tvInstructions.netflix;

    // Build Sky instruction based on job's skyStyle
    // NOTE: "as-is" is the default - AI must not hallucinate sky/clouds/scenery
    const skyInstructions: Record<string, string> = {
      "blue-clouds": "SKY ONLY: If the photo has a visible overcast/dull sky, you MAY replace ONLY THE PIXELS that are sky (above the rooflines/horizon) with clear blue sky and scattered white clouds. ABSOLUTE RULES: (1) NEVER touch dirt, dirt patches, construction zones, gravel, or driveways - leave them EXACTLY as they appear. (2) NEVER replace ground, lawns, driveways, or roads with anything else. (3) NEVER add grass where there is dirt. (4) ONLY modify the sky pixels themselves, nothing else.",
      "clear-blue": "SKY ONLY: If the photo has a visible overcast/dull sky, you MAY replace ONLY the sky pixels with pure clear blue sky. ABSOLUTE RULES: NEVER touch ground, dirt, driveways, grass, or anything below the rooflines. ONLY modify sky pixels.",
      "golden-hour": "SKY ONLY: If the photo has a visible dull sky, you MAY replace ONLY the sky pixels with a warm golden hour sky. ABSOLUTE RULES: NEVER touch ground, dirt, driveways, grass, or anything below the rooflines. ONLY modify sky pixels.",
      "dramatic": "SKY ONLY: If the photo has a visible dull sky, you MAY replace ONLY the sky pixels with a dramatic deep blue sky with bold clouds. ABSOLUTE RULES: NEVER touch ground, dirt, driveways, grass, or anything below the rooflines. ONLY modify sky pixels.",
      "overcast-soft": "Do NOT modify the sky.",
      "as-is": "Do NOT modify or replace the sky. Keep the original sky exactly as it appears. Do not add clouds. Do not brighten the sky.",
    };
    // CRITICAL: only apply sky instruction to EXTERIOR photos
    // Interior photos must NEVER have sky replacement (windows look like sky to AI)
    const skyInstruction = analysis.isExterior
      ? (skyInstructions[(job as any).skyStyle || "as-is"] || skyInstructions["as-is"])
      : "INTERIOR PHOTO DETECTED: Do NOT replace, modify, or add anything to windows, sky areas, or anything visible through glass. Do NOT add clouds, sky, grass, trees, or scenery anywhere. Keep all windows and views EXACTLY as they appear in the original.";

    // HDR merge instruction - tells Gemini to fuse the multiple bracket exposures
    const hdrInstruction = validBrackets.length > 1
      ? `\n\nHDR MERGE: The ${validBrackets.length} input images above are bracketed exposures of the SAME scene at different exposure levels (under-exposed, normal, over-exposed). Merge them into a single high-dynamic-range image:
- Use the UNDER-exposed image to recover detail in BRIGHT areas (windows, lights, sky)
- Use the OVER-exposed image to recover detail in DARK areas (shadows, corners, dim rooms)
- Use the MIDDLE exposure as your tonal foundation
- The output must be a SINGLE merged photo, not a collage. Same composition as the brackets.
- Maintain the EXACT same camera angle, framing, and content as the brackets.`
      : "";

    const combinedInstructions = [hdrInstruction, tvInstruction, skyInstruction].filter(Boolean).join("\n");
    const fullPrompt = customPresetPrompt
      ? `${customPresetPrompt}\n\n${combinedInstructions}`
      : combinedInstructions;

    // Enhance the photo - pass ALL brackets for HDR merge
    const result = await enhancePhoto(validBrackets, mimeType, job.preset, fullPrompt);

    if (!result.success) {
      await prisma.photo.update({ where: { id: photo.id }, data: { status: "pending" } });
      return NextResponse.json({ error: result.error, photoId: photo.id });
    }

    // Upload edited image to Dropbox - upscale to 4K if AI returned smaller (sharp already imported above)
    const aiOutputBuffer = Buffer.from(result.imageBase64!, "base64");
    const aiMeta = await sharp(aiOutputBuffer).metadata();
    const aiWidth = aiMeta.width || 1024;
    const TARGET_WIDTH = 3840; // 4K width

    let outputBuffer: Buffer;
    if (aiWidth >= TARGET_WIDTH) {
      // Already 4K or larger — re-encode as JPEG for size
      outputBuffer = await sharp(aiOutputBuffer).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    } else {
      // Upscale with lanczos (high quality)
      const aspectRatio = (aiMeta.height || 768) / aiWidth;
      const targetHeight = Math.round(TARGET_WIDTH * aspectRatio);
      outputBuffer = await sharp(aiOutputBuffer)
        .resize(TARGET_WIDTH, targetHeight, { kernel: "lanczos3", fit: "fill" })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
      console.log(`[enhance] Upscaled from ${aiWidth}x${aiMeta.height} to ${TARGET_WIDTH}x${targetHeight}`);
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
      // Mark photo as pending again, don't bill
      await prisma.photo.update({
        where: { id: photo.id },
        data: { status: "pending" },
      });
      return NextResponse.json({
        error: `Dropbox upload failed after 3 attempts: ${lastError?.message}`,
        photoId: photo.id,
      }, { status: 500 });
    }

    await prisma.photo.update({
      where: { id: photo.id },
      data: { editedUrl, status: "edited" },
    });

    await logActivity({
      type: "photo_enhanced",
      message: `Photo enhanced (HDR merge)`,
      jobId: jobId,
      photoId: photo.id,
      userId: access.userId,
    });

    // Track cost
    await prisma.job.update({
      where: { id: jobId },
      data: {
        cost: { increment: AI_COST_PER_IMAGE },
        processedPhotos: { increment: 1 },
        status: "processing",
      },
    });

    // Count remaining
    const remaining = await prisma.photo.count({
      where: { jobId, status: "pending" },
    });

    return NextResponse.json({
      done: false,
      photoId: photo.id,
      remaining,
      editedUrl,
    });
  } catch (error: any) {
    console.error("Process-next error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
