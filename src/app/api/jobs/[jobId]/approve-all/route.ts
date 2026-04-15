import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { notifyJobWatchers } from "@/lib/notify";

export const dynamic = "force-dynamic";

// POST /api/jobs/:jobId/approve-all - approve all edited photos in one transaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  try {
    // Approve all photos that are 'edited' (not pending, not processing, not already approved/rejected)
    await prisma.photo.updateMany({
      where: { jobId, status: "edited" },
      data: { status: "approved" },
    });

    // Recalculate counts
    const [approvedCount, rejectedCount, processedCount, totalPhotos] = await Promise.all([
      prisma.photo.count({ where: { jobId, status: "approved" } }),
      prisma.photo.count({ where: { jobId, status: "rejected" } }),
      prisma.photo.count({ where: { jobId, status: { notIn: ["pending", "processing"] } } }),
      prisma.photo.count({ where: { jobId } }),
    ]);

    const newJobStatus = (approvedCount + rejectedCount === totalPhotos && totalPhotos > 0)
      ? "approved"
      : access.job.status;

    await prisma.job.update({
      where: { id: jobId },
      data: {
        approvedPhotos: approvedCount,
        rejectedPhotos: rejectedCount,
        processedPhotos: processedCount,
        status: newJobStatus,
      },
    });

    if (newJobStatus === "approved" && access.job.status !== "approved") {
      await notifyJobWatchers({
        jobId,
        newStatus: "approved",
        jobAddress: access.job.address,
        photographerId: access.job.photographerId,
        excludeUserId: access.userId,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      approvedCount,
      jobStatus: newJobStatus,
    });
  } catch (error: any) {
    console.error("Bulk approve error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
