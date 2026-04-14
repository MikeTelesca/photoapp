import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enhancePhoto, convertToTwilight, analyzePhoto } from "@/lib/ai-enhance";
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

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// POST /api/jobs/:jobId/photos/:photoId/enhance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { jobId, photoId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const { customInstructions, makeTwilight } = body as {
      customInstructions?: string;
      makeTwilight?: boolean;
    };

    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!photo || !job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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

    // Get original image from Dropbox
    let imageBuffer: Buffer;
    const mimeType = "image/jpeg";

    if (photo.originalUrl && photo.originalUrl.startsWith("http")) {
      const response = await fetch(photo.originalUrl);
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } else if (job.dropboxUrl && photo.exifData) {
      const exif = JSON.parse(photo.exifData);
      const fileName = exif?.photos?.[0]?.fileName;
      if (!fileName) {
        return NextResponse.json({ error: "No source filename" }, { status: 400 });
      }
      imageBuffer = await downloadFromDropbox(job.dropboxUrl, fileName);
    } else {
      return NextResponse.json({ error: "No source image" }, { status: 400 });
    }

    let result;

    if (makeTwilight) {
      result = await convertToTwilight(imageBuffer, mimeType, customInstructions);
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
      const tvInstruction = tvInstructions[(job as any).tvStyle || "netflix"] || tvInstructions.netflix;

      // Build Sky instruction based on job's skyStyle
      const skyInstructions: Record<string, string> = {
        "blue-clouds": "For EXTERIOR shots: Replace the sky with a clear blue sky with scattered fluffy white cumulus clouds. The sun should appear to be at a 45-degree angle creating warm natural light. Use this EXACT same sky appearance for consistency across all photos.",
        "clear-blue": "For EXTERIOR shots: Replace the sky with a pure crystal clear blue sky with no clouds at all. Deep blue at the top, lighter blue near the horizon. Consistent across all photos.",
        "golden-hour": "For EXTERIOR shots: Replace the sky with a warm golden hour sky - soft orange and pink hues near the horizon transitioning to warm blue above. The lighting should feel like late afternoon sun. Consistent across all photos.",
        "dramatic": "For EXTERIOR shots: Replace the sky with a dramatic deep blue sky with large bold white cumulus clouds. Strong contrast between sky and clouds. Consistent across all photos.",
        "overcast-soft": "For EXTERIOR shots: Keep the sky as a bright, even, soft white/light gray overcast. This provides very even, flattering lighting on the property. Do not add blue sky.",
        "as-is": "Do NOT modify or replace the sky. Keep the original sky exactly as it appears in the photo.",
      };
      const skyInstruction = skyInstructions[(job as any).skyStyle || "blue-clouds"] || skyInstructions["blue-clouds"];

      const additionalInstructions = [tvInstruction, skyInstruction];
      if (customInstructions) additionalInstructions.push(customInstructions);
      const combinedInstructions = additionalInstructions.join("\n");

      result = await enhancePhoto(imageBuffer, mimeType, job.preset, customPresetPrompt ? `${customPresetPrompt}\n\n${combinedInstructions}` : combinedInstructions);
    }

    if (!result.success) {
      await prisma.photo.update({
        where: { id: photoId },
        data: { status: "pending" },
      });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Store edited image
    const outputBuffer = Buffer.from(result.imageBase64!, "base64");
    const sanitizedAddress = job.address.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);
    const editedFileName = `photo_${photo.orderIndex + 1}.jpg`;
    const dropboxPath = `/PhotoApp/edited/${sanitizedAddress}_${job.id.substring(0, 8)}/${editedFileName}`;

    let editedUrl: string;
    try {
      editedUrl = await uploadToDropbox(outputBuffer, dropboxPath);
    } catch (uploadError) {
      console.error("Dropbox upload failed, using data URL:", uploadError);
      editedUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: {
        editedUrl,
        status: "edited",
        customInstructions: customInstructions || null,
        isTwilight: makeTwilight || photo.isTwilight,
      },
    });

    // Track cost
    const AI_COST_PER_IMAGE = 0.04;
    await prisma.job.update({
      where: { id: jobId },
      data: { cost: { increment: AI_COST_PER_IMAGE } },
    });

    return NextResponse.json({ success: true, photoId, editedUrl });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Enhance error:", err);
    await prisma.photo.update({
      where: { id: photoId },
      data: { status: "pending" },
    }).catch(() => {});
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
