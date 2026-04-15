import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const [
    totalPhotos,
    totalJobs,
    deletedJobs,
    archivedJobs,
    topUsers,
  ] = await Promise.all([
    prisma.photo.count().catch(() => 0),
    prisma.job.count({ where: { archivedAt: null } }).catch(() => 0),
    prisma.job.count({ where: { status: "deleted" } }).catch(() => 0),
    prisma.job.count({ where: { archivedAt: { not: null } } }).catch(() => 0),
    prisma.user.findMany({
      include: {
        _count: { select: { jobs: true } },
        jobs: {
          select: { totalPhotos: true, cost: true },
        },
      },
      take: 50,
    }).catch(() => []),
  ]);

  const userStats = topUsers
    .map((u: any) => ({
      id: u.id,
      name: u.name || u.email,
      jobCount: u._count.jobs,
      photoCount: u.jobs.reduce((s: number, j: any) => s + (j.totalPhotos || 0), 0),
      totalCost: u.jobs.reduce((s: number, j: any) => s + (j.cost || 0), 0),
    }))
    .filter(u => u.photoCount > 0)
    .sort((a, b) => b.photoCount - a.photoCount)
    .slice(0, 10);

  return NextResponse.json({
    totals: {
      photos: totalPhotos,
      activeJobs: totalJobs,
      archivedJobs,
      deletedJobs,
    },
    topUsers: userStats,
  });
}
