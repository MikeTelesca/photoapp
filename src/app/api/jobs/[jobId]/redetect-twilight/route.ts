import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { isTwilightTime } from "@/lib/twilight-detect";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Re-run twilight detection on all photos in a job.
 * Uses EXIF dateTimeOriginal (from stored exifData) and the isTwilightTime
 * heuristic to mark each photo's isTwilight flag. Also refreshes
 * job.twilightCount with the total number of twilight photos detected.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const photos = await prisma.photo.findMany({
    where: { jobId },
    select: { id: true, exifData: true, isTwilight: true },
  });

  let twilightCount = 0;
  let changed = 0;
  const updates: Array<{ id: string; isTwilight: boolean }> = [];

  for (const p of photos) {
    let isTwilight = false;
    if (p.exifData) {
      try {
        const data = JSON.parse(p.exifData);
        // exifData may be a single photo or wrap { photos: [...] }.
        const items = Array.isArray(data?.photos) ? data.photos : [data];
        let checked = 0;
        let hits = 0;
        for (const item of items) {
          const time = item?.dateTimeOriginal || item?.dateTaken || item?.avgTimestamp;
          if (time) {
            checked++;
            if (isTwilightTime(time)) hits++;
          }
        }
        // Also consider wrapper-level avgTimestamp if present
        if (checked === 0 && data?.avgTimestamp) {
          checked++;
          if (isTwilightTime(data.avgTimestamp)) hits++;
        }
        if (checked > 0 && hits / checked > 0.5) isTwilight = true;
      } catch {
        // skip unparseable exif
      }
    }

    if (isTwilight) twilightCount++;
    if (isTwilight !== p.isTwilight) {
      updates.push({ id: p.id, isTwilight });
      changed++;
    }
  }

  // Apply updates
  for (const u of updates) {
    await prisma.photo.update({
      where: { id: u.id },
      data: { isTwilight: u.isTwilight },
    });
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { twilightCount },
  });

  return NextResponse.json({
    success: true,
    totalPhotos: photos.length,
    twilightCount,
    changed,
  });
}
