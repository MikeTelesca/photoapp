import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { uploadToDropbox } from "@/lib/dropbox";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const { ids, degrees } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No ids" }, { status: 400 });
  }
  const angle = [90, -90, 180].includes(degrees) ? degrees : 90;

  const photos = await prisma.photo.findMany({
    where: { id: { in: ids }, jobId },
  });

  let rotated = 0;
  let failed = 0;

  const sharp = (await import("sharp")).default;

  for (const photo of photos) {
    const url = photo.editedUrl || photo.originalUrl;
    if (!url) {
      failed++;
      continue;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) {
        failed++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const out = await sharp(buf).rotate(angle).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
      const path = `/ath-editor-edits/${jobId}/${photo.id}-rotated-${Date.now()}.jpg`;
      const newUrl = await uploadToDropbox(out, path);
      await prisma.photo.update({
        where: { id: photo.id },
        data: { editedUrl: newUrl },
      });
      rotated++;
    } catch (err) {
      console.error("bulk rotate err:", err);
      failed++;
    }
  }

  return NextResponse.json({ rotated, failed });
}
