import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string; versionId: string }> }
) {
  const { jobId, photoId, versionId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const version = await prisma.photoVersion.findUnique({ where: { id: versionId } });
  if (!version || version.photoId !== photoId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Save current as a new version, then swap to the older one
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (photo?.editedUrl) {
    await prisma.photoVersion.create({
      data: { photoId, url: photo.editedUrl, preset: "current" },
    }).catch(() => {});
  }

  await prisma.photo.update({
    where: { id: photoId },
    data: { editedUrl: version.url },
  });

  return NextResponse.json({ ok: true });
}
