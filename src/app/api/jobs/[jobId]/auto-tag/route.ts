import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { detectPhotoTags } from "@/lib/photo-tags";

export const maxDuration = 300;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const photos = await prisma.photo.findMany({
    where: { jobId, autoTags: null, status: { not: "pending" } },
    select: { id: true, editedUrl: true, originalUrl: true },
    take: 100,
  });

  if (photos.length === 0) {
    return NextResponse.json({ ok: true, message: "All photos already tagged", tagged: 0 });
  }

  let tagged = 0;
  let failed = 0;

  for (const photo of photos) {
    const url = photo.editedUrl || photo.originalUrl;
    if (!url) {
      failed++;
      continue;
    }
    try {
      const tags = await detectPhotoTags(url);
      if (tags.length > 0) {
        await prisma.photo.update({
          where: { id: photo.id },
          data: { autoTags: JSON.stringify(tags) },
        });
        tagged++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error("retag err:", err);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, requested: photos.length, tagged, failed });
}
