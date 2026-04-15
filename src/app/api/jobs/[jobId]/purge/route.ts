import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity";

// DELETE /api/jobs/:jobId/purge - permanently remove a trashed job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const access = await requireJobAccess(jobId);
    if ("error" in access) return access.error;

    if (!access.job.deletedAt) {
      return NextResponse.json(
        { error: "Job must be in trash before it can be permanently deleted" },
        { status: 400 }
      );
    }

    const address = access.job.address;

    await prisma.job.delete({ where: { id: jobId } });

    await logActivity({
      type: "job_purged",
      message: `Permanently deleted job for ${address}`,
      userId: access.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to purge job:", error);
    return NextResponse.json(
      { error: "Failed to permanently delete job" },
      { status: 500 }
    );
  }
}
