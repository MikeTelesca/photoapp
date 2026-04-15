import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

// GET /api/jobs/:jobId/photos/:photoId/download
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  try {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { job: true },
    });

    if (!photo || photo.jobId !== jobId) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    if (!photo.editedUrl) {
      return NextResponse.json(
        { error: "No edited photo available" },
        { status: 400 }
      );
    }

    let buffer: Buffer;
    if (photo.editedUrl.startsWith("http")) {
      const res = await fetch(photo.editedUrl);
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      // Fall back to base64 decode
      const base64Data = photo.editedUrl.split(",")[1];
      if (!base64Data) {
        return NextResponse.json(
          { error: "Invalid photo data" },
          { status: 500 }
        );
      }
      buffer = Buffer.from(base64Data, "base64");
    }

    // Apply watermark if configured
    const watermarkText = photo.job.watermarkText;
    if (watermarkText && watermarkText.trim().length > 0) {
      const sharp = (await import("sharp")).default;
      const meta = await sharp(buffer).metadata();
      const w = meta.width || 1920;
      const h = meta.height || 1080;

      const fontSize = Math.round(w / 40);
      const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <text x="${w - 20}" y="${h - 20}" text-anchor="end"
              font-family="Helvetica, Arial, sans-serif"
              font-size="${fontSize}"
              font-weight="600"
              fill="rgba(255,255,255,0.85)"
              stroke="rgba(0,0,0,0.5)"
              stroke-width="1">${watermarkText.replace(/[<>&"']/g, '')}</text>
      </svg>`;

      buffer = await sharp(buffer)
        .composite([{ input: Buffer.from(svg), gravity: "southeast" }])
        .jpeg({ quality: 92 })
        .toBuffer();
    }

    const sanitizedAddress = photo.job.address
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 50);
    const filename = `${sanitizedAddress}_${String(photo.orderIndex + 1).padStart(3, "0")}.jpg`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
