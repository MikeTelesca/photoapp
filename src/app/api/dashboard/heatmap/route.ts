import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// GET /api/dashboard/heatmap
// Returns last 365 days of activity for the signed-in user:
//   [{ date: "YYYY-MM-DD", photos: number, jobs: number }, ...]
// - photos: number of Photo rows created that day (across the user's jobs)
// - jobs:   number of Job rows created that day by the user
// Admins see everything; photographers see only their own.
export async function GET() {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId, role } = authResult;

    // Build 365-day window anchored at the start of today (local server time).
    const now = new Date();
    const endExclusive = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );
    const start = new Date(endExclusive);
    start.setDate(start.getDate() - 365);

    const photoWhereBase =
      role === "admin" ? {} : { job: { photographerId: userId } };
    const jobWhereBase =
      role === "admin" ? {} : { photographerId: userId };

    const [photos, jobs] = await Promise.all([
      prisma.photo.findMany({
        where: {
          ...photoWhereBase,
          createdAt: { gte: start, lt: endExclusive },
        },
        select: { createdAt: true },
      }),
      prisma.job.findMany({
        where: {
          ...jobWhereBase,
          createdAt: { gte: start, lt: endExclusive },
        },
        select: { createdAt: true },
      }),
    ]);

    // Aggregate counts per YYYY-MM-DD bucket (server-local calendar day).
    const buckets = new Map<string, { photos: number; jobs: number }>();

    // Seed every day in the window so the grid is always 365 cells.
    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      buckets.set(toIsoDate(d), { photos: 0, jobs: 0 });
    }

    for (const p of photos) {
      const key = toIsoDate(p.createdAt);
      const slot = buckets.get(key);
      if (slot) slot.photos++;
    }
    for (const j of jobs) {
      const key = toIsoDate(j.createdAt);
      const slot = buckets.get(key);
      if (slot) slot.jobs++;
    }

    const data = Array.from(buckets.entries())
      .map(([date, v]) => ({ date, photos: v.photos, jobs: v.jobs }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    return NextResponse.json({ days: data });
  } catch (error) {
    console.error("Failed to fetch heatmap:", error);
    return NextResponse.json({ days: [] }, { status: 200 });
  }
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
