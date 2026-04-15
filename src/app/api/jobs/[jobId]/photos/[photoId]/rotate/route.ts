import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { uploadToDropbox } from "@/lib/dropbox";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const { degrees } = await request.json();
  const angle = [90, -90, 180].includes(degrees) ? degrees : 90;

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sourceUrl = photo.editedUrl || photo.originalUrl;
  if (!sourceUrl) return NextResponse.json({ error: "No image" }, { status: 400 });

  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    const buf = Buffer.from(await res.arrayBuffer());

    const sharp = (await import("sharp")).default;
    const rotated = await sharp(buf)
      .rotate(angle)
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    const path = `/ath-editor-edits/${jobId}/${photoId}-rotated-${Date.now()}.jpg`;
    const newUrl = await uploadToDropbox(rotated, path);

    await prisma.photo.update({
      where: { id: photoId },
      data: { editedUrl: newUrl },
    });

    return NextResponse.json({ ok: true, url: newUrl });
  } catch (err: any) {
    console.error("rotate err:", err);
    return NextResponse.json({ error: err.message || "Rotate failed" }, { status: 500 });
  }
}
