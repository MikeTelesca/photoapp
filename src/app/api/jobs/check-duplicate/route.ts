import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const address = request.nextUrl.searchParams.get("address") || "";
  if (!address || address.length < 5) {
    return NextResponse.json({ matches: [] });
  }

  // Normalize for loose matching (strip punctuation, lowercase)
  const normalized = address.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Find jobs by this user in last 14 days
  const recent = await prisma.job.findMany({
    where: {
      photographerId: auth.userId,
      createdAt: { gte: fourteenDaysAgo },
    },
    select: { id: true, address: true, status: true, createdAt: true, totalPhotos: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  }).catch(() => []);

  // Match by normalized substring overlap
  const matches = recent.filter(j => {
    const n = j.address.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return n === normalized || n.includes(normalized) || normalized.includes(n);
  });

  return NextResponse.json({ matches });
}
