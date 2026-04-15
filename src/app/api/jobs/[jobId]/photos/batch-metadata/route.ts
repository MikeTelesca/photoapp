import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const body = await request.json();
  const {
    photoIds,
    caption,
    note,
    flagged,
    appendCaption,
  }: {
    photoIds?: string[];
    caption?: string;
    note?: string;
    flagged?: boolean;
    appendCaption?: boolean;
  } = body ?? {};

  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: "No photoIds" }, { status: 400 });
  }

  const hasCaption = typeof caption === "string";
  const hasNote = typeof note === "string";
  const hasFlagged = typeof flagged === "boolean";

  if (!hasCaption && !hasNote && !hasFlagged) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  let count = 0;

  if (appendCaption && hasCaption) {
    // Need per-photo reads to concatenate captions.
    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds }, jobId },
      select: { id: true, caption: true, note: true },
    });

    for (const p of photos) {
      const data: Record<string, unknown> = {};
      const trimmed = (caption ?? "").trim();
      if (trimmed.length > 0) {
        data.caption = p.caption ? `${p.caption} ${caption}` : caption;
      } else {
        data.caption = p.caption ?? null;
      }
      if (hasNote) {
        data.note = note && note.length > 0 ? note : null;
      }
      if (hasFlagged) {
        data.flagged = flagged;
      }
      await prisma.photo.update({ where: { id: p.id }, data });
      count++;
    }
  } else {
    const data: Record<string, unknown> = {};
    if (hasCaption) data.caption = caption!.length > 0 ? caption : null;
    if (hasNote) data.note = note!.length > 0 ? note : null;
    if (hasFlagged) data.flagged = flagged;

    const result = await prisma.photo.updateMany({
      where: { id: { in: photoIds }, jobId },
      data,
    });
    count = result.count;
  }

  return NextResponse.json({ count });
}
