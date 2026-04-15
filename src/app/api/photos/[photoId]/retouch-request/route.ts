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

  let body: { request?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body?.request;
  let retouchRequest: string | null;
  if (raw === null || raw === undefined) {
    retouchRequest = null;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    retouchRequest = trimmed.length === 0 ? null : trimmed.slice(0, 2000);
  } else {
    return NextResponse.json(
      { error: "`request` must be a string or null" },
      { status: 400 }
    );
  }

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
    data: { retouchRequest },
    select: { retouchRequest: true },
  });

  return NextResponse.json({ retouchRequest: updated.retouchRequest });
}
