import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enhancePhoto, convertToTwilight, analyzePhoto } from "@/lib/ai-enhance";
import { downloadFileFromSharedLink, uploadToDropbox } from "@/lib/dropbox";

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

    // Get photo and job
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!photo || !job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Update status to processing
    await prisma.photo.update({
      where: { id: photoId },
      data: { status: "processing" },
    });

    // Get the original image
    let imageBuffer: Buffer;
    const mimeType = "image/jpeg";

    if (photo.originalUrl) {
      // Download from URL
      const response = await fetch(photo.originalUrl);
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else if (job.dropboxUrl && photo.exifData) {
      // Try to get the first file from the bracket group via Dropbox
      const exif = JSON.parse(photo.exifData);
      const fileName = exif?.photos?.[0]?.fileName;
      if (fileName && job.dropboxUrl) {
        imageBuffer = await downloadFileFromSharedLink(job.dropboxUrl, `/${fileName}`);
      } else {
        return NextResponse.json({ error: "No source image available" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "No source image available" }, { status: 400 });
    }

    let result;

    if (makeTwilight) {
      // Twilight conversion
      result = await convertToTwilight(imageBuffer, mimeType, customInstructions);
    } else {
      // Analyze the photo if not already analyzed
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

      // Enhance the photo
      result = await enhancePhoto(imageBuffer, mimeType, job.preset, customInstructions);
    }

    if (!result.success) {
      await prisma.photo.update({
        where: { id: photoId },
        data: { status: "pending" },
      });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const outputBuffer = Buffer.from(result.imageBase64!, "base64");

    // Create a Dropbox path for the edited photo
    const sanitizedAddress = job.address.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);
    const fileName = `photo_${photo.orderIndex + 1}.jpg`;
    const dropboxPath = `/PhotoApp/edited/${sanitizedAddress}_${job.id.substring(0, 8)}/${fileName}`;

    let editedUrl: string;
    try {
      editedUrl = await uploadToDropbox(outputBuffer, dropboxPath);
    } catch (uploadError) {
      console.error("Failed to upload to Dropbox, falling back to data URL:", uploadError);
      // Fallback to data URL if Dropbox upload fails
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

    // Track cost (~$0.04 per AI enhancement)
    const AI_COST_PER_IMAGE = 0.04;
    await prisma.job.update({
      where: { id: jobId },
      data: { cost: { increment: AI_COST_PER_IMAGE } },
    });

    return NextResponse.json({
      success: true,
      photoId,
      editedUrl,
    });
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
