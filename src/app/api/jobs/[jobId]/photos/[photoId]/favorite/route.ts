import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo || photo.jobId !== jobId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.photo.update({
    where: { id: photoId },
    data: { isFavorite: !photo.isFavorite },
  });

  return NextResponse.json({ isFavorite: updated.isFavorite });
}
