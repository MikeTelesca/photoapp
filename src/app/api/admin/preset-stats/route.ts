import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  // Group jobs by preset
  const jobStats = await prisma.job
    .groupBy({
      by: ["preset"],
      _count: { _all: true },
      _sum: { totalPhotos: true, approvedPhotos: true, cost: true },
    })
    .catch(() => []);

  const stats = jobStats
    .map((s) => ({
      preset: s.preset || "unknown",
      jobCount: s._count._all,
      totalPhotos: s._sum.totalPhotos || 0,
      approvedPhotos: s._sum.approvedPhotos || 0,
      totalCost: s._sum.cost || 0,
      approvalRate:
        s._sum.totalPhotos && s._sum.totalPhotos > 0
          ? ((s._sum.approvedPhotos || 0) / s._sum.totalPhotos) * 100
          : 0,
    }))
    .sort((a, b) => b.jobCount - a.jobCount);

  return NextResponse.json({ stats });
}
