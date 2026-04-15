import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireUser();
    if ("error" in auth) return auth.error;

    const jobs = await prisma.job.findMany({
      where: { photographerId: auth.userId },
      select: { address: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }).catch(() => []);

    // Dedupe addresses, keep most recent
    const seen = new Set<string>();
    const addresses: string[] = [];
    for (const j of jobs) {
      if (j.address && !seen.has(j.address)) {
        seen.add(j.address);
        addresses.push(j.address);
      }
      if (addresses.length >= 50) break;
    }

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error("Failed to fetch addresses:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses", addresses: [] },
      { status: 500 }
    );
  }
}
