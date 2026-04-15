import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const { photoId } = await request.json();
  if (!photoId) {
    // Clear cover
    await prisma.job.update({ where: { id: jobId }, data: { coverPhotoId: null } });
    return NextResponse.json({ ok: true });
  }

  // Verify photo belongs to job
  const photo = await prisma.photo.findFirst({ where: { id: photoId, jobId } });
  if (!photo) return NextResponse.json({ error: "Photo not found in this job" }, { status: 404 });

  await prisma.job.update({
    where: { id: jobId },
    data: { coverPhotoId: photoId },
  });

  return NextResponse.json({ ok: true });
}
