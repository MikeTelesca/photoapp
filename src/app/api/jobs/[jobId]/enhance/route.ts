import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enhancePhoto, analyzePhoto } from "@/lib/ai-enhance";
import { downloadFileFromSharedLink, uploadToDropbox } from "@/lib/dropbox";
import { requireJobAccess } from "@/lib/api-auth";

// POST /api/jobs/:jobId/enhance - enhance all photos in a job
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
    let totalCost = 0;

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
          const editedImageBuffer = Buffer.from(result.imageBase64, "base64");

          // Create a Dropbox path for the edited photo
          const sanitizedAddress = job.address.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);
          const fileName = `photo_${photo.orderIndex + 1}.jpg`;
          const dropboxPath = `/PhotoApp/edited/${sanitizedAddress}_${job.id.substring(0, 8)}/${fileName}`;

          // Upload with retry
          let editedUrl: string | null = null;
          let lastError: Error | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              editedUrl = await uploadToDropbox(editedImageBuffer, dropboxPath);
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
            console.error(`Dropbox upload failed after 3 attempts for photo ${photo.id}: ${lastError?.message}`);
            failed++;
            continue;
          }

          await prisma.photo.update({
            where: { id: photo.id },
            data: {
              editedUrl,
              status: "edited",
              isExterior: analysis.isExterior,
              detections: JSON.stringify(analysis.detections),
            },
          });
          processed++;

          // Track cost (~$0.04 per AI enhancement)
          const AI_COST_PER_IMAGE = 0.04;
          totalCost += AI_COST_PER_IMAGE;
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

    // Update job status with total cost
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "review",
        processedPhotos: processed,
        cost: { increment: totalCost },
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
