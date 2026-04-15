import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiKey } from "@/lib/api-key-auth";
import { checkRate } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const auth = await requireApiKey(request);
  if ("error" in auth) return auth.error;

  const rateErr = await checkRate(auth.userId, "default");
  if (rateErr) return rateErr;

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "20"), 100);
  const status = request.nextUrl.searchParams.get("status");

  const where: any = { photographerId: auth.userId, archivedAt: null };
  if (status) where.status = status;

  const jobs = await prisma.job.findMany({
    where,
    select: {
      id: true,
      address: true,
      clientName: true,
      preset: true,
      status: true,
      totalPhotos: true,
      approvedPhotos: true,
      rejectedPhotos: true,
      cost: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  }).catch(() => []);

  return NextResponse.json({ jobs, count: jobs.length });
}
