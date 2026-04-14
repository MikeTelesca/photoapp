import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/stats - dashboard stats
export async function GET() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalJobs, processingJobs, reviewJobs, approvedToday, monthlyCost, totalImages] =
    await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { status: "processing" } }),
      prisma.job.count({ where: { status: "review" } }),
      prisma.job.count({
        where: { status: "approved", updatedAt: { gte: startOfDay } },
      }),
      prisma.job.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { cost: true },
      }),
      prisma.photo.count({
        where: { status: { not: "pending" }, createdAt: { gte: startOfMonth } },
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
}
