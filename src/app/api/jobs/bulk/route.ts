import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;

    const { action, ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No ids" }, { status: 400 });
    }

    const userId = authResult.userId;

    if (action === "delete") {
      const res = await prisma.job.updateMany({
        where: { id: { in: ids }, photographerId: userId, status: { not: "deleted" } },
        data: { status: "deleted" },
      });

      // Log activity for each deleted job
      for (const jobId of ids) {
        const job = await prisma.job.findUnique({
          where: { id: jobId },
          select: { address: true },
        });
        if (job) {
          await logActivity({
            type: "job_deleted",
            message: `Deleted job for ${job.address}`,
            jobId: jobId,
            userId: userId,
          });
        }
      }

      return NextResponse.json({ count: res.count });
    }

    if (action === "approve") {
      const res = await prisma.job.updateMany({
        where: { id: { in: ids }, photographerId: userId, status: "review" },
        data: { status: "approved" },
      });

      // Log activity for each approved job
      for (const jobId of ids) {
        const job = await prisma.job.findUnique({
          where: { id: jobId },
          select: { address: true },
        });
        if (job) {
          await logActivity({
            type: "job_approved",
            message: `Approved job for ${job.address}`,
            jobId: jobId,
            userId: userId,
          });
        }
      }

      return NextResponse.json({ count: res.count });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to perform bulk action:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk action" },
      { status: 500 }
    );
  }
}
