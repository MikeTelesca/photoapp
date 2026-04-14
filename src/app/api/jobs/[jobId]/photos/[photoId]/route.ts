import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/jobs/:jobId/photos/:photoId - update a photo (approve, reject, etc)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { photoId } = await params;
  const body = await request.json();

  const photo = await prisma.photo.update({
    where: { id: photoId },
    data: body,
  });

  // Update job counts
  const job = await prisma.job.findUnique({
    where: { id: photo.jobId },
    include: { photos: true },
  });

  if (job) {
    const approvedCount = job.photos.filter((p) => p.status === "approved").length;
    const rejectedCount = job.photos.filter((p) => p.status === "rejected").length;
    const processedCount = job.photos.filter((p) => p.status !== "pending" && p.status !== "processing").length;

    await prisma.job.update({
      where: { id: job.id },
      data: {
        approvedPhotos: approvedCount,
        rejectedPhotos: rejectedCount,
        processedPhotos: processedCount,
        // Auto-update job status
        status: approvedCount === job.totalPhotos ? "approved" : job.status,
      },
    });
  }

  return NextResponse.json(photo);
}
