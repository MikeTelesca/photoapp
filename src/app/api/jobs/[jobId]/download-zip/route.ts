import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import JSZip from "jszip";
import sharp from "sharp";

export const maxDuration = 300;

// Parse a data URL (`data:<mime>;base64,<data>`) into a Buffer + mime string.
function decodeDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { buffer: Buffer.from(match[2], "base64"), mime: match[1] };
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]+/g, "_").replace(/^_+|_+$/g, "");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const format = request.nextUrl.searchParams.get("format") || "jpeg-90";

  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const photos = await prisma.photo.findMany({
      where: { jobId, status: "approved" },
      orderBy: { orderIndex: "asc" },
    });

    if (photos.length === 0) {
      return NextResponse.json({ error: "No approved photos" }, { status: 400 });
    }

    const zip = new JSZip();
    const addressSlug = sanitize(job.address) || "job";

    const isPng = format === "png";
    const jpegQuality = (() => {
      if (format === "jpeg-75") return 75;
      if (format === "jpeg-85") return 85;
      if (format === "jpeg-95") return 95;
      return 90;
    })();

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (!photo.editedUrl) continue;
      const decoded = decodeDataUrl(photo.editedUrl);
      if (!decoded) continue;

      const pipeline = sharp(decoded.buffer);
      const output = isPng
        ? await pipeline.png().toBuffer()
        : await pipeline.jpeg({ quality: jpegQuality }).toBuffer();

      const ext = isPng ? "png" : "jpg";
      const fileName = `${addressSlug}_${i + 1}.${ext}`;
      zip.file(fileName, output);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    void access;
    return new NextResponse(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${addressSlug}.zip"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[download-zip] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
