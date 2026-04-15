import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalPhotos = job.totalPhotos || 0;
  const processedPhotos = job.processedPhotos || 0;
  const remaining = Math.max(0, totalPhotos - processedPhotos);

  if (remaining === 0) {
    return NextResponse.json({ remaining: 0, etaSeconds: 0, perPhotoSeconds: 0 });
  }

  // Get average per-photo enhancement time from this user's last 50 completed photos
  const recentPhotos = await prisma.photo.findMany({
    where: {
      job: { photographerId: job.photographerId },
      status: { in: ["edited", "approved", "rejected"] },
    },
    select: { createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  }).catch(() => []);

  let perPhotoSeconds = 30; // default fallback (30 seconds)
  if (recentPhotos.length >= 5) {
    const durations = recentPhotos
      .map(p => {
        if (!p.updatedAt) return 0;
        return (p.updatedAt.getTime() - p.createdAt.getTime()) / 1000;
      })
      .filter(d => d > 0 && d < 600); // sane bounds (1s - 10min)

    if (durations.length > 0) {
      // Use median to avoid outliers
      durations.sort((a, b) => a - b);
      perPhotoSeconds = durations[Math.floor(durations.length / 2)];
    }
  }

  const etaSeconds = Math.round(perPhotoSeconds * remaining);

  return NextResponse.json({
    remaining,
    etaSeconds,
    perPhotoSeconds: Math.round(perPhotoSeconds),
    totalPhotos,
    processedPhotos,
  });
}
