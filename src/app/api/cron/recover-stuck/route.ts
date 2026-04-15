import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/error-log";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret if provided
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Find photos stuck in "processing" with no recent update and reset them to "pending"
    const stuckPhotos = await prisma.photo.updateMany({
      where: {
        status: "processing",
        updatedAt: { lt: tenMinutesAgo },
      },
      data: { status: "pending" },
    });

    // Log recovery of stuck photos
    if (stuckPhotos.count > 0) {
      await logError({
        source: "stuck-recovery",
        message: `Recovered ${stuckPhotos.count} stuck photos from processing state`,
        metadata: { recoveredCount: stuckPhotos.count },
      }).catch(() => {});
    }

    // Find jobs that are still in "processing" status
    const activeJobs = await prisma.job.findMany({
      where: { status: "processing" },
      include: { photos: { select: { status: true } } },
    });

    let reviewCount = 0;
    for (const job of activeJobs) {
      // Check if all photos are done (no more processing or pending)
      const allDone =
        job.photos.length > 0 &&
        job.photos.every(
          (p) =>
            p.status === "edited" ||
            p.status === "approved" ||
            p.status === "rejected" ||
            p.status === "regenerating"
        );

      if (allDone) {
        await prisma.job.update({
          where: { id: job.id },
          data: { status: "review" },
        });
        reviewCount++;
      }
    }

    return NextResponse.json({
      success: true,
      resetStuckPhotos: stuckPhotos.count,
      jobsMovedToReview: reviewCount,
      checkedJobs: activeJobs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron recover-stuck error:", error);
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
}
