import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enhancePhoto, analyzePhoto } from "@/lib/ai-enhance";
import { downloadFileFromSharedLink } from "@/lib/dropbox";

// POST /api/jobs/:jobId/enhance - enhance all photos in a job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { photos: { orderBy: { orderIndex: "asc" } } },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!job.dropboxUrl) {
      return NextResponse.json({ error: "No Dropbox URL" }, { status: 400 });
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { status: "processing" },
    });

    let processed = 0;
    let failed = 0;

    for (const photo of job.photos) {
      if (photo.status === "approved" || photo.editedUrl) {
        processed++;
        continue; // Skip already processed
      }

      try {
        // Get source image from Dropbox
        let imageBuffer: Buffer | null = null;
        const mimeType = "image/jpeg";

        if (photo.exifData) {
          const exif = JSON.parse(photo.exifData);
          const fileName = exif?.photos?.[0]?.fileName;
          if (fileName) {
            imageBuffer = await downloadFileFromSharedLink(job.dropboxUrl!, `/${fileName}`);
          }
        }

        if (!imageBuffer) {
          failed++;
          continue;
        }

        // Analyze photo
        const analysis = await analyzePhoto(imageBuffer, mimeType);

        // Enhance
        const result = await enhancePhoto(imageBuffer, mimeType, job.preset);

        if (result.success && result.imageBase64) {
          const editedDataUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
          await prisma.photo.update({
            where: { id: photo.id },
            data: {
              editedUrl: editedDataUrl,
              status: "edited",
              isExterior: analysis.isExterior,
              detections: JSON.stringify(analysis.detections),
            },
          });
          processed++;
        } else {
          failed++;
        }

        // Update progress
        await prisma.job.update({
          where: { id: jobId },
          data: { processedPhotos: processed },
        });
      } catch (error) {
        console.error(`Failed to enhance photo ${photo.id}:`, error);
        failed++;
      }
    }

    // Update job status
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "review",
        processedPhotos: processed,
      },
    });

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: job.photos.length,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Batch enhance error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
