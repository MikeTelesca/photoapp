import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const address = request.nextUrl.searchParams.get("address") || "";
  const dropboxUrl = request.nextUrl.searchParams.get("dropboxUrl") || "";

  // At least one must be provided
  if ((!address || address.length < 5) && !dropboxUrl) {
    return NextResponse.json({ matches: [] });
  }

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Find jobs by this user in last 14 days
  const recent = await prisma.job.findMany({
    where: {
      photographerId: auth.userId,
      createdAt: { gte: fourteenDaysAgo },
    },
    select: { id: true, address: true, dropboxUrl: true, status: true, createdAt: true, totalPhotos: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  }).catch(() => []);

  // Normalize address for loose matching (strip punctuation, lowercase)
  const normalized = address.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  // Match by normalized address or exact Dropbox URL
  const matches = recent.filter(j => {
    // Exact Dropbox URL match
    if (dropboxUrl && j.dropboxUrl && j.dropboxUrl.trim() === dropboxUrl.trim()) {
      return true;
    }
    // Normalized address match (only if address provided)
    if (address && j.address) {
      const n = j.address.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (n === normalized || n.includes(normalized) || normalized.includes(n)) {
        return true;
      }
    }
    return false;
  });

  return NextResponse.json({ matches });
}
