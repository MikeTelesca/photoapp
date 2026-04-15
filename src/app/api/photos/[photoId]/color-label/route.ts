import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

const ALLOWED_COLORS = new Set([
  "red",
  "amber",
  "emerald",
  "blue",
  "purple",
  "pink",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const color = (body as { color?: unknown })?.color;
  if (color !== null && typeof color !== "string") {
    return NextResponse.json({ error: "Invalid color" }, { status: 400 });
  }
  if (typeof color === "string" && !ALLOWED_COLORS.has(color)) {
    return NextResponse.json({ error: "Invalid color" }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
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
    data: { colorLabel: color as string | null },
    select: { colorLabel: true },
  });

  return NextResponse.json({ colorLabel: updated.colorLabel });
}
