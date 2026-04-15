import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;

    const recentJobs = await prisma.job.findMany({
      where: { photographerId: authResult.userId, archivedAt: null },
      select: { preset: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    if (recentJobs.length === 0) {
      return NextResponse.json({ preset: "standard", source: "default" });
    }

    // Mode (most common) of recent presets
    const counts = new Map<string, number>();
    for (const j of recentJobs) {
      counts.set(j.preset, (counts.get(j.preset) || 0) + 1);
    }

    let bestPreset = recentJobs[0].preset;
    let bestCount = 0;
    for (const [preset, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestPreset = preset;
      }
    }

    return NextResponse.json({
      preset: bestPreset,
      source: "history",
      confidence: bestCount / recentJobs.length,
    });
  } catch (error) {
    console.error("Failed to fetch suggested preset:", error);
    return NextResponse.json(
      { preset: "standard", source: "default", error: "fallback" },
      { status: 200 }
    );
  }
}
