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

  const { x, y, width, height } = await request.json();

  if ([x, y, width, height].some(v => typeof v !== "number" || v < 0 || v > 100)) {
    return NextResponse.json({ error: "Invalid crop" }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sourceUrl = photo.editedUrl || photo.originalUrl;
  if (!sourceUrl) return NextResponse.json({ error: "No image" }, { status: 400 });

  try {
    const res = await fetch(sourceUrl);
    const buf = Buffer.from(await res.arrayBuffer());

    const sharp = (await import("sharp")).default;
    const meta = await sharp(buf).metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;

    const cropX = Math.round((x / 100) * w);
    const cropY = Math.round((y / 100) * h);
    const cropW = Math.round((width / 100) * w);
    const cropH = Math.round((height / 100) * h);

    const cropped = await sharp(buf)
      .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    const dropboxPath = `/ath-editor-crops/${jobId}/${photoId}-cropped-${Date.now()}.jpg`;
    let shareUrl: string;
    try {
      shareUrl = await uploadToDropbox(cropped, dropboxPath);
    } catch (uploadErr: any) {
      console.error("apply-crop: Dropbox upload failed, keeping original editedUrl:", uploadErr);
      // Fallback: crop was applied in memory but couldn't be persisted externally.
      // Return ok with the existing URL so the UI knows it worked partially.
      return NextResponse.json({ ok: true, url: photo.editedUrl, warning: "Crop processed but Dropbox upload failed" });
    }

    // Save as new editedUrl
    await prisma.photo.update({
      where: { id: photoId },
      data: { editedUrl: shareUrl },
    });

    return NextResponse.json({ ok: true, url: shareUrl });
  } catch (err: any) {
    console.error("apply-crop err:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
