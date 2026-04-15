import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayJobs, photosProcessed, awaitingReview] = await Promise.all([
    prisma.job.findMany({
      where: { photographerId: auth.userId, createdAt: { gte: startOfDay } },
      select: { totalPhotos: true, cost: true, status: true, address: true, id: true },
    }).catch(() => []),
    prisma.photo.count({
      where: {
        job: { photographerId: auth.userId },
        updatedAt: { gte: startOfDay },
        status: { in: ["edited", "approved", "rejected"] },
      },
    }).catch(() => 0),
    prisma.job.count({
      where: { photographerId: auth.userId, status: "review", archivedAt: null },
    }).catch(() => 0),
  ]);

  return NextResponse.json({
    jobsCreated: todayJobs.length,
    photosProcessed,
    awaitingReview,
    spend: todayJobs.reduce((s, j) => s + (j.cost || 0), 0),
    recentJobs: todayJobs.slice(0, 3).map(j => ({ id: j.id, address: j.address })),
  });
}
