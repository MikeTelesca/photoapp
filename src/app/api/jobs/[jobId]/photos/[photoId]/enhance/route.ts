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

    // Load custom preset prompt if not a built-in preset
    let customPresetPrompt: string | null = null;
    const builtInPresets = ["standard", "bright-airy", "luxury"];
    if (!builtInPresets.includes(job.preset)) {
      const preset = await prisma.preset.findFirst({ where: { slug: job.preset } });
      if (preset?.promptModifiers) {
        customPresetPrompt = preset.promptModifiers;
      }
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

      result = await enhancePhoto(imageBuffer, mimeType, job.preset, customPresetPrompt || customInstructions);
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
