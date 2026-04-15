import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { uploadToDropbox } from "@/lib/dropbox";

export const runtime = "nodejs";
export const maxDuration = 60;

const RATIOS: Record<string, { w: number; h: number }> = {
  "3:2": { w: 3, h: 2 },
  "4:3": { w: 4, h: 3 },
  "1:1": { w: 1, h: 1 },
  "16:9": { w: 16, h: 9 },
  "5:4": { w: 5, h: 4 },
  "4:5": { w: 4, h: 5 }, // Instagram portrait
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const { ratio } = await request.json();
  const cfg = RATIOS[ratio];
  if (!cfg) return NextResponse.json({ error: "Invalid ratio" }, { status: 400 });

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
    if (!w || !h) return NextResponse.json({ error: "Invalid image dims" }, { status: 500 });

    // Compute crop centered
    const targetAspect = cfg.w / cfg.h;
    const currentAspect = w / h;

    let cropW: number, cropH: number;
    if (currentAspect > targetAspect) {
      // Image is wider than target — crop sides
      cropH = h;
      cropW = Math.round(h * targetAspect);
    } else {
      // Image is taller than target — crop top/bottom
      cropW = w;
      cropH = Math.round(w / targetAspect);
    }

    const cropX = Math.round((w - cropW) / 2);
    const cropY = Math.round((h - cropH) / 2);

    const cropped = await sharp(buf)
      .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    const path = `/ath-editor-edits/${jobId}/${photoId}-${ratio.replace(":", "x")}-${Date.now()}.jpg`;
    const newUrl = await uploadToDropbox(cropped, path);

    await prisma.photo.update({
      where: { id: photoId },
      data: { editedUrl: newUrl },
    });

    return NextResponse.json({ ok: true, url: newUrl, ratio, dimensions: { w: cropW, h: cropH } });
  } catch (err: any) {
    console.error("aspect crop err:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
