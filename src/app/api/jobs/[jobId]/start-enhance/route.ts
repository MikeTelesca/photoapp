import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enhancePhoto, analyzePhoto } from "@/lib/ai-enhance";
import { uploadToDropbox } from "@/lib/dropbox";

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

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        photos: {
          where: { status: "pending" },
          orderBy: { orderIndex: "asc" },
          take: 1,
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.photos.length === 0) {
      // No more pending photos - mark job as review-ready
      const totalEdited = await prisma.photo.count({
        where: { jobId, status: { in: ["edited", "approved"] } },
      });
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "review", processedPhotos: totalEdited },
      });
      return NextResponse.json({ done: true, processed: totalEdited });
    }

    const photo = job.photos[0];

    // Mark as processing so another request won't pick it up
    await prisma.photo.update({
      where: { id: photo.id },
      data: { status: "processing" },
    });

    // Get source image
    if (!job.dropboxUrl || !photo.exifData) {
      await prisma.photo.update({ where: { id: photo.id }, data: { status: "pending" } });
      return NextResponse.json({ error: "No source data", skipped: true });
    }

    const exif = JSON.parse(photo.exifData);
    const fileName = exif?.photos?.[0]?.fileName;
    if (!fileName) {
      await prisma.photo.update({ where: { id: photo.id }, data: { status: "pending" } });
      return NextResponse.json({ error: "No filename in exif", skipped: true });
    }

    const imageBuffer = await downloadFromDropbox(job.dropboxUrl, fileName);
    const mimeType = "image/jpeg";

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
      "blue-clouds": "OPTIONAL SKY ENHANCEMENT (only if photo is an EXTERIOR with visible sky): If the existing sky is clearly overcast/dull/gray, you MAY replace ONLY the sky area with a clear blue sky with scattered white clouds. DO NOT touch anything below the horizon line. DO NOT add clouds to an already-clear sky. If the photo is INTERIOR or has no sky visible, do NOT modify anything.",
      "clear-blue": "OPTIONAL SKY ENHANCEMENT (only if photo is an EXTERIOR with visible sky): If the existing sky is clearly overcast/dull, you MAY replace ONLY the sky area with a pure clear blue sky. DO NOT touch anything below the horizon. If INTERIOR or no sky visible, do NOT modify.",
      "golden-hour": "OPTIONAL SKY ENHANCEMENT (only if photo is an EXTERIOR with visible sky): If the existing sky is dull, you MAY replace ONLY the sky with a warm golden hour sky. DO NOT touch anything below the horizon. If INTERIOR, do NOT modify.",
      "dramatic": "OPTIONAL SKY ENHANCEMENT (only if photo is an EXTERIOR with visible sky): If the existing sky is dull, you MAY replace ONLY the sky with a dramatic deep blue sky with bold clouds. DO NOT touch anything below the horizon. If INTERIOR, do NOT modify.",
      "overcast-soft": "Do NOT modify the sky.",
      "as-is": "Do NOT modify or replace the sky. Keep the original sky exactly as it appears. Do not add clouds. Do not brighten the sky.",
    };
    const skyInstruction = skyInstructions[(job as any).skyStyle || "as-is"] || skyInstructions["as-is"];

    const combinedInstructions = [tvInstruction, skyInstruction].join("\n");
    const fullPrompt = customPresetPrompt
      ? `${customPresetPrompt}\n\n${combinedInstructions}`
      : combinedInstructions;

    // Enhance the photo
    const result = await enhancePhoto(imageBuffer, mimeType, job.preset, fullPrompt);

    if (!result.success) {
      await prisma.photo.update({ where: { id: photo.id }, data: { status: "pending" } });
      return NextResponse.json({ error: result.error, photoId: photo.id });
    }

    // Upload edited image to Dropbox
    const outputBuffer = Buffer.from(result.imageBase64!, "base64");
    const sanitizedAddress = job.address.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);
    const editedFileName = `photo_${photo.orderIndex + 1}.jpg`;
    const dropboxPath = `/PhotoApp/edited/${sanitizedAddress}_${job.id.substring(0, 8)}/${editedFileName}`;

    let editedUrl: string;
    try {
      editedUrl = await uploadToDropbox(outputBuffer, dropboxPath);
    } catch {
      editedUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
    }

    await prisma.photo.update({
      where: { id: photo.id },
      data: { editedUrl, status: "edited" },
    });

    // Track cost
    await prisma.job.update({
      where: { id: jobId },
      data: {
        cost: { increment: 0.04 },
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
