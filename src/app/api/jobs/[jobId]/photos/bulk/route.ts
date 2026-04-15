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

  const { ids, action, value } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No ids" }, { status: 400 });
  }

  let data: any = {};
  switch (action) {
    case "approve":
      data = { status: "approved", rejectionReason: null };
      break;
    case "reject":
      data = { status: "rejected", rejectionReason: value || "Bulk rejected" };
      break;
    case "favorite":
      data = { isFavorite: true };
      break;
    case "unfavorite":
      data = { isFavorite: false };
      break;
    case "clearStatus":
      data = { status: "edited", rejectionReason: null };
      break;
    case "addNote":
      return await handleBulkAppendNote(ids, jobId, value);
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const result = await prisma.photo.updateMany({
    where: { id: { in: ids }, jobId },
    data,
  });

  return NextResponse.json({ count: result.count });
}

async function handleBulkAppendNote(ids: string[], jobId: string, text: string | undefined) {
  if (!text || text.trim() === "") {
    return NextResponse.json({ error: "Note text required" }, { status: 400 });
  }
  const photos = await prisma.photo.findMany({
    where: { id: { in: ids }, jobId },
    select: { id: true, note: true },
  });
  let count = 0;
  for (const p of photos) {
    const newNote = p.note ? `${p.note}\n${text}` : text;
    await prisma.photo.update({ where: { id: p.id }, data: { note: newNote } });
    count++;
  }
  return NextResponse.json({ count });
}
