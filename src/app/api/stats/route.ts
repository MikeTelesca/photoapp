import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// GET /api/stats - dashboard stats
export async function GET() {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId, role } = authResult;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Photographers see only their own stats
    const scope = role === "admin" ? {} : { photographerId: userId };
    const photoScope =
      role === "admin" ? {} : { job: { photographerId: userId } };

    const [totalJobs, processingJobs, reviewJobs, approvedToday, monthlyCost, totalImages] =
      await Promise.all([
        prisma.job.count({ where: scope }),
        prisma.job.count({ where: { ...scope, status: "processing" } }),
        prisma.job.count({ where: { ...scope, status: "review" } }),
        prisma.job.count({
          where: { ...scope, status: "approved", updatedAt: { gte: startOfDay } },
        }),
        prisma.job.aggregate({
          where: { ...scope, createdAt: { gte: startOfMonth } },
          _sum: { cost: true },
        }),
        prisma.photo.count({
          where: {
            ...photoScope,
            status: { not: "pending" },
            createdAt: { gte: startOfMonth },
          },
        }),
      ]);

    return NextResponse.json({
      totalJobs,
      processingJobs,
      reviewJobs,
      approvedToday,
      monthlyCost: monthlyCost._sum.cost || 0,
      totalImagesThisMonth: totalImages,
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      {
        totalJobs: 0,
        processingJobs: 0,
        reviewJobs: 0,
        approvedToday: 0,
        monthlyCost: 0,
        totalImagesThisMonth: 0,
      },
      { status: 200 }
    );
  }
}
