import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  let body: { pinned?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.pinned !== "boolean") {
    return NextResponse.json({ error: "pinned must be boolean" }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { jobId: true },
  });
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
    data: { notePinned: body.pinned },
    select: { notePinned: true },
  });

  return NextResponse.json({ notePinned: updated.notePinned });
}
