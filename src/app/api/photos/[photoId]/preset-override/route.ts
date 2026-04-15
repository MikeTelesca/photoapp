import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

const ALLOWED_PRESETS = new Set(["standard", "luxury"]);

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

  const preset = (body as { preset?: unknown })?.preset;
  if (preset !== null && typeof preset !== "string") {
    return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
  }
  if (typeof preset === "string" && !ALLOWED_PRESETS.has(preset)) {
    return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
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
    data: { presetOverride: preset as string | null },
    select: { presetOverride: true },
  });

  return NextResponse.json({ presetOverride: updated.presetOverride });
}
