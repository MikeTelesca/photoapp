import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// GET /api/user/tags
// Returns the current user's most-used tags (top 30) aggregated from their jobs.
// Tags are distinct tokens from `job.tags` strings split by comma.
export async function GET() {
  try {
    const auth = await requireUser();
    if ("error" in auth) return auth.error;

    const jobs = await prisma.job
      .findMany({
        where: { photographerId: auth.userId },
        select: { tags: true },
        take: 1000,
      })
      .catch(() => [] as { tags: string | null }[]);

    const tagCounts = new Map<string, number>();
    for (const j of jobs) {
      if (!j.tags) continue;
      const seenInJob = new Set<string>();
      j.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((raw) => {
          const key = raw.toLowerCase();
          if (seenInJob.has(key)) return;
          seenInJob.add(key);
          tagCounts.set(raw, (tagCounts.get(raw) || 0) + 1);
        });
    }

    const sorted = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([tag, count]) => ({ tag, count }));

    return NextResponse.json({ tags: sorted });
  } catch (error) {
    console.error("Failed to fetch user tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags", tags: [] },
      { status: 500 }
    );
  }
}
