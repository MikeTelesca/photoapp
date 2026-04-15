import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiKey } from "@/lib/api-key-auth";
import { checkRate } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const auth = await requireApiKey(request);
  if ("error" in auth) return auth.error;

  const rateErr = await checkRate(auth.userId, "default");
  if (rateErr) return rateErr;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfYear = new Date(new Date().getFullYear(), 0, 1);

  const [totalJobs, monthJobs, monthCost, yearCost, awaitingReview, totalPhotos] = await Promise.all([
    prisma.job.count({ where: { photographerId: auth.userId, archivedAt: null } }).catch(() => 0),
    prisma.job.count({ where: { photographerId: auth.userId, createdAt: { gte: startOfMonth } } }).catch(() => 0),
    prisma.job.aggregate({
      where: { photographerId: auth.userId, createdAt: { gte: startOfMonth } },
      _sum: { cost: true },
    }).then(r => r._sum.cost || 0).catch(() => 0),
    prisma.job.aggregate({
      where: { photographerId: auth.userId, createdAt: { gte: startOfYear } },
      _sum: { cost: true },
    }).then(r => r._sum.cost || 0).catch(() => 0),
    prisma.job.count({ where: { photographerId: auth.userId, status: "review", archivedAt: null } }).catch(() => 0),
    prisma.photo.count({ where: { job: { photographerId: auth.userId } } }).catch(() => 0),
  ]);

  return NextResponse.json({
    totalJobs,
    monthJobs,
    monthCost: Math.round(monthCost * 100) / 100,
    yearCost: Math.round(yearCost * 100) / 100,
    awaitingReview,
    totalPhotos,
    timestamp: new Date().toISOString(),
  });
}
