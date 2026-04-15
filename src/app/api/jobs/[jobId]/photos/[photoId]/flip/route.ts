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

  const { axis } = await request.json();
  if (!["horizontal", "vertical"].includes(axis)) {
    return NextResponse.json({ error: "axis must be 'horizontal' or 'vertical'" }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sourceUrl = photo.editedUrl || photo.originalUrl;
  if (!sourceUrl) return NextResponse.json({ error: "No image" }, { status: 400 });

  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    const buf = Buffer.from(await res.arrayBuffer());

    const sharp = (await import("sharp")).default;
    let pipeline = sharp(buf);
    if (axis === "horizontal") pipeline = pipeline.flop(); // mirror left-right
    else pipeline = pipeline.flip(); // mirror top-bottom

    const flipped = await pipeline
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    const path = `/ath-editor-edits/${jobId}/${photoId}-flipped-${Date.now()}.jpg`;
    const newUrl = await uploadToDropbox(flipped, path);

    await prisma.photo.update({
      where: { id: photoId },
      data: { editedUrl: newUrl },
    });

    return NextResponse.json({ ok: true, url: newUrl });
  } catch (err: any) {
    console.error("flip err:", err);
    return NextResponse.json({ error: err.message || "Flip failed" }, { status: 500 });
  }
}
