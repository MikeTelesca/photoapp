import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import JSZip from "jszip";
import sharp from "sharp";

export const maxDuration = 300;

// Common MLS presets (max width x height, most MLS accept JPEG)
const PRESETS: Record<string, { width: number; height: number; quality: number }> = {
  "mls-standard": { width: 1024, height: 768, quality: 85 },
  "mls-hi": { width: 1920, height: 1440, quality: 88 },
  "mls-4k": { width: 3840, height: 2160, quality: 90 },
  "web": { width: 1600, height: 1200, quality: 82 },
  "social": { width: 1080, height: 1080, quality: 85 }, // 1:1 square for Insta
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const preset = request.nextUrl.searchParams.get("preset") || "mls-hi";
  const cfg = PRESETS[preset];
  if (!cfg) return NextResponse.json({ error: "Unknown preset" }, { status: 400 });

  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = await prisma.photo.findMany({
    where: { jobId, status: "approved" },
    orderBy: { orderIndex: "asc" },
  });
  if (photos.length === 0) {
    return NextResponse.json({ error: "No approved photos" }, { status: 400 });
  }

  const zip = new JSZip();
  const addr = job.address.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  let idx = 0;

  for (const photo of photos) {
    const url = photo.editedUrl || photo.originalUrl;
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const src = Buffer.from(await res.arrayBuffer());

      const fit = preset === "social" ? "cover" : "inside";
      const resized = await sharp(src)
        .resize(cfg.width, cfg.height, { fit, withoutEnlargement: true })
        .jpeg({ quality: cfg.quality, mozjpeg: true })
        .toBuffer();

      idx++;
      zip.file(`${addr}-${String(idx).padStart(3, "0")}.jpg`, resized);
    } catch (err) {
      console.error("mls export err:", err);
    }
  }

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${addr}-${preset}.zip"`,
    },
  });
}
