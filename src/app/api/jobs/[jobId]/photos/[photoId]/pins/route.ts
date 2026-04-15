import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ jobId: string; photoId: string }> }) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const pins = await prisma.photoPin.findMany({
    where: { photoId },
    orderBy: { createdAt: "asc" },
  }).catch(() => []);
  return NextResponse.json({ pins });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ jobId: string; photoId: string }> }) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const { x, y, note } = await request.json();
  if (typeof x !== "number" || typeof y !== "number" || x < 0 || x > 100 || y < 0 || y > 100) {
    return NextResponse.json({ error: "Invalid coords" }, { status: 400 });
  }
  if (!note || !note.trim()) {
    return NextResponse.json({ error: "Note required" }, { status: 400 });
  }

  const pin = await prisma.photoPin.create({
    data: { photoId, x, y, note: note.trim().slice(0, 500) },
  });
  return NextResponse.json(pin);
}
