import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireUser();
    if ("error" in auth) return auth.error;

    const jobs = await prisma.job.findMany({
      where: { photographerId: auth.userId },
      select: { tags: true },
      take: 500,
    }).catch(() => []);

    const tagCounts = new Map<string, number>();
    for (const j of jobs) {
      if (!j.tags) continue;
      j.tags
        .split(",")
        .map(t => t.trim())
        .filter(Boolean)
        .forEach(t => {
          tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
        });
    }

    const sorted = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));

    return NextResponse.json({ tags: sorted });
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags", tags: [] },
      { status: 500 }
    );
  }
}
