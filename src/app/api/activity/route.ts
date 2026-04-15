import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");

  // Photographers see only their job activity
  let where: any = {};
  if (auth.role !== "admin") {
    const userJobIds = await prisma.job.findMany({
      where: { photographerId: auth.userId },
      select: { id: true },
    });
    where.jobId = { in: userJobIds.map((j) => j.id) };
  }

  const activities = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Hydrate with job addresses
  const jobIds = [...new Set(activities.map((a) => a.jobId).filter(Boolean) as string[])];
  const jobs = await prisma.job.findMany({
    where: { id: { in: jobIds } },
    select: { id: true, address: true },
  });
  const jobMap = new Map(jobs.map((j) => [j.id, j.address]));

  return NextResponse.json(
    activities.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      jobAddress: a.jobId ? jobMap.get(a.jobId) : null,
      jobId: a.jobId,
      photoId: a.photoId,
      createdAt: a.createdAt,
    }))
  );
}
