import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity";

// PATCH /api/jobs/:jobId/photos/:photoId - update a photo (approve, reject, etc)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const body = await request.json();

  // Mass assignment defense: whitelist allowed fields
  const allowed: Record<string, any> = {};
  const allowedFields = [
    "status",
    "customInstructions",
    "customPromptOverride",
    "isTwilight",
    "isFavorite",
    "twilightInstructions",
    "twilightStyle",
    "editedUrl",
    "rejectionReason",
    "note",
    "flagged",
  ] as const;
  for (const field of allowedFields) {
    if (body[field] !== undefined) allowed[field] = body[field];
  }

  // Verify photo belongs to this job to prevent cross-job tampering
  const existing = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!existing || existing.jobId !== jobId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const photo = await prisma.photo.update({
    where: { id: photoId },
    data: allowed,
  });

  // Update job counts using efficient count queries
  const [approvedCount, rejectedCount, processedCount] = await Promise.all([
    prisma.photo.count({ where: { jobId: photo.jobId, status: "approved" } }),
    prisma.photo.count({ where: { jobId: photo.jobId, status: "rejected" } }),
    prisma.photo.count({
      where: {
        jobId: photo.jobId,
        status: { notIn: ["pending", "processing"] },
      },
    }),
  ]);

  const job = await prisma.job.findUnique({ where: { id: photo.jobId } });
  const jobNowApproved = job && (approvedCount + rejectedCount === job.totalPhotos && job.totalPhotos > 0) && job.status !== "approved";
  if (job) {
    await prisma.job.update({
      where: { id: job.id },
      data: {
        approvedPhotos: approvedCount,
        rejectedPhotos: rejectedCount,
        processedPhotos: processedCount,
        // Auto-update job status: all reviewed (approved + rejected) and not empty
        status: (approvedCount + rejectedCount === job.totalPhotos && job.totalPhotos > 0)
          ? "approved"
          : job.status,
      },
    });

    if (jobNowApproved) {
      await logActivity({
        type: "job_approved",
        message: `All ${job.totalPhotos} photos reviewed — job approved`,
        jobId: job.id,
        userId: access.userId,
      });
    }
  }

  if (body.status === "approved") {
    await logActivity({
      type: "photo_approved",
      message: `Photo approved`,
      jobId: photo.jobId,
      photoId: photo.id,
      userId: access.userId,
    });
  } else if (body.status === "rejected") {
    await logActivity({
      type: "photo_rejected",
      message: `Photo rejected`,
      jobId: photo.jobId,
      photoId: photo.id,
      userId: access.userId,
    });
  }

  return NextResponse.json(photo);
}
