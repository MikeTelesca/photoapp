import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// GET /api/dashboard/photo-stats - per-user photo processing stats for dashboard widget
export async function GET() {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId, role } = authResult;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Photographers see only their own stats; admins see everything
    const photoWhereBase =
      role === "admin" ? {} : { job: { photographerId: userId } };
    const jobWhereBase =
      role === "admin" ? {} : { photographerId: userId };

    // A photo is "processed" when it has been edited (or further along)
    const processedStatuses = ["edited", "approved", "rejected"];

    const [
      photosProcessedToday,
      photosProcessedWeek,
      photosProcessedMonth,
      jobsCompletedWeek,
      jobsCompletedMonth,
      topRoomPhotos,
    ] = await Promise.all([
      prisma.photo.count({
        where: {
          ...photoWhereBase,
          status: { in: processedStatuses },
          updatedAt: { gte: startOfDay },
        },
      }),
      prisma.photo.count({
        where: {
          ...photoWhereBase,
          status: { in: processedStatuses },
          updatedAt: { gte: startOfWeek },
        },
      }),
      prisma.photo.count({
        where: {
          ...photoWhereBase,
          status: { in: processedStatuses },
          updatedAt: { gte: startOfMonth },
        },
      }),
      prisma.job.count({
        where: {
          ...jobWhereBase,
          status: "approved",
          updatedAt: { gte: startOfWeek },
          deletedAt: null,
        },
      }),
      prisma.job.count({
        where: {
          ...jobWhereBase,
          status: "approved",
          updatedAt: { gte: startOfMonth },
          deletedAt: null,
        },
      }),
      // Pull processed photos for this month, then aggregate roomType from JSON in memory.
      // SQLite doesn't support JSON aggregation natively, so we do the tally here.
      prisma.photo.findMany({
        where: {
          ...photoWhereBase,
          status: { in: processedStatuses },
          updatedAt: { gte: startOfMonth },
          OR: [
            { autoTags: { not: null } },
            { exifData: { not: null } },
          ],
        },
        select: { autoTags: true, exifData: true },
        take: 2000,
      }),
    ]);

    // Aggregate roomType from each photo's JSON fields (autoTags / exifData)
    const roomCounts = new Map<string, number>();
    for (const p of topRoomPhotos) {
      const room = extractRoomType(p.autoTags, p.exifData);
      if (!room) continue;
      roomCounts.set(room, (roomCounts.get(room) || 0) + 1);
    }
    const topRoomTypes = Array.from(roomCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([roomType, count]) => ({ roomType, count }));

    return NextResponse.json({
      photosProcessedToday,
      photosProcessedWeek,
      photosProcessedMonth,
      jobsCompletedWeek,
      jobsCompletedMonth,
      topRoomTypes,
    });
  } catch (error) {
    console.error("Failed to fetch photo stats:", error);
    return NextResponse.json(
      {
        photosProcessedToday: 0,
        photosProcessedWeek: 0,
        photosProcessedMonth: 0,
        jobsCompletedWeek: 0,
        jobsCompletedMonth: 0,
        topRoomTypes: [],
      },
      { status: 200 }
    );
  }
}

function extractRoomType(
  autoTagsRaw: string | null,
  exifDataRaw: string | null
): string | null {
  // Prefer explicit roomType field on exifData JSON
  if (exifDataRaw) {
    try {
      const exif = JSON.parse(exifDataRaw);
      const rt =
        exif?.roomType ||
        exif?.room_type ||
        exif?.room ||
        null;
      if (typeof rt === "string" && rt.trim()) {
        return normalizeRoom(rt);
      }
    } catch {
      // fall through to autoTags
    }
  }

  // Fall back to autoTags — an array of string tags. Match a known room vocabulary.
  if (autoTagsRaw) {
    try {
      const tags = JSON.parse(autoTagsRaw);
      if (Array.isArray(tags)) {
        for (const t of tags) {
          if (typeof t !== "string") continue;
          const norm = normalizeRoom(t);
          if (norm && KNOWN_ROOMS.has(norm)) return norm;
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

const KNOWN_ROOMS = new Set([
  "kitchen",
  "living-room",
  "bedroom",
  "bathroom",
  "dining-room",
  "office",
  "exterior",
  "interior",
  "garage",
  "basement",
  "hallway",
  "laundry",
  "closet",
  "patio",
  "backyard",
  "pool",
  "foyer",
  "entry",
]);

function normalizeRoom(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
}
