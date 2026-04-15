import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity";

// POST /api/jobs/:jobId/restore - restore a soft-deleted job from trash
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const access = await requireJobAccess(jobId);
    if ("error" in access) return access.error;

    if (!access.job.deletedAt) {
      return NextResponse.json(
        { error: "Job is not in trash" },
        { status: 400 }
      );
    }

    const restored = await prisma.job.update({
      where: { id: jobId },
      data: {
        deletedAt: null,
        // If job was marked with status "deleted", restore to a sensible default
        status: access.job.status === "deleted" ? "pending" : access.job.status,
      },
    });

    await logActivity({
      type: "job_restored",
      message: `Restored job for ${restored.address}`,
      jobId: jobId,
      userId: access.userId,
    });

    return NextResponse.json({ success: true, job: restored });
  } catch (error) {
    console.error("Failed to restore job:", error);
    return NextResponse.json(
      { error: "Failed to restore job" },
      { status: 500 }
    );
  }
}
