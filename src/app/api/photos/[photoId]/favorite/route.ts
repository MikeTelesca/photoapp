import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Non-admin users: ensure the photo's job belongs to them
  if (auth.role !== "admin") {
    const job = await prisma.job.findUnique({
      where: { id: photo.jobId },
      select: { photographerId: true },
    });
    if (!job || job.photographerId !== auth.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const updated = await prisma.photo.update({
    where: { id: photoId },
    data: { favorited: !photo.favorited },
    select: { favorited: true },
  });

  return NextResponse.json({ favorited: updated.favorited });
}
