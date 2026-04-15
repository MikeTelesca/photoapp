import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import JSZip from "jszip";

export const maxDuration = 300;

// GET /api/jobs/:jobId/download - download approved photos as ZIP or individual files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        photos: {
          where: { status: "approved", editedUrl: { not: null } },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.photos.length === 0) {
      return NextResponse.json(
        { error: "No approved photos to download" },
        { status: 400 }
      );
    }

    const url = request.nextUrl;
    if (url.searchParams.get("format") === "zip") {
      // Build ZIP server-side
      const zip = new JSZip();
      const sanitizedAddress = job.address
        .replace(/[^a-zA-Z0-9]/g, "_")
        .substring(0, 40);

      const watermarkText = job.watermarkText as string | null;
      let sharpLib: any = null;
      if (watermarkText && watermarkText.trim().length > 0) {
        sharpLib = (await import("sharp")).default;
      }

      for (const photo of job.photos) {
        if (!photo.editedUrl) continue;

        let buffer: Buffer;
        if (photo.editedUrl.startsWith("http")) {
          // Fetch from Dropbox URL
          const res = await fetch(photo.editedUrl);
          buffer = Buffer.from(await res.arrayBuffer());
        } else if (photo.editedUrl.startsWith("data:")) {
          // Decode base64 data URL (legacy)
          const base64 = photo.editedUrl.split(",")[1];
          buffer = Buffer.from(base64, "base64");
        } else {
          continue;
        }

        // Apply watermark if configured
        if (sharpLib && watermarkText && watermarkText.trim().length > 0) {
          const meta = await sharpLib(buffer).metadata();
          const w = meta.width || 1920;
          const h = meta.height || 1080;

          const fontSize = (job as any).watermarkSize || 32;
          const opacity = (job as any).watermarkOpacity ?? 0.7;
          const position = (job as any).watermarkPosition || "bottom-right";

          const gravityMap: Record<string, string> = {
            "top-left": "northwest",
            "top-right": "northeast",
            "bottom-left": "southwest",
            "bottom-right": "southeast",
            "center": "center",
          };
          const gravity = gravityMap[position] || "southeast";

          const textX = position.includes("right") ? "95%" : position.includes("left") ? "5%" : "50%";
          const textAnchor = position.includes("right") ? "end" : position.includes("left") ? "start" : "middle";
          const svgHeight = fontSize * 2 + 8;
          const safeText = watermarkText.replace(/[<>&"']/g, '');

          const svg = `<svg width="${w}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
            <text x="${textX}" y="${fontSize + 4}" text-anchor="${textAnchor}"
                  font-family="Helvetica, Arial, sans-serif"
                  font-size="${fontSize}"
                  font-weight="600"
                  fill="white"
                  fill-opacity="${opacity}"
                  stroke="black"
                  stroke-width="1"
                  stroke-opacity="${opacity * 0.5}">${safeText}</text>
          </svg>`;

          buffer = await sharpLib(buffer)
            .composite([{ input: Buffer.from(svg), gravity }])
            .jpeg({ quality: 92 })
            .toBuffer();
        }

        const fileName = `${sanitizedAddress}_${String(photo.orderIndex + 1).padStart(3, "0")}.jpg`;
        zip.file(fileName, buffer);
      }

      const zipBuffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "STORE",
      });

      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${sanitizedAddress}_photos.zip"`,
        },
      });
    }

    // For a single photo, return it directly
    if (job.photos.length === 1) {
      const photo = job.photos[0];
      const sanitizedAddress = job.address
        .replace(/[^a-zA-Z0-9]/g, "_")
        .substring(0, 50);

      let buffer: Buffer;
      if (photo.editedUrl!.startsWith("http")) {
        const res = await fetch(photo.editedUrl!);
        buffer = Buffer.from(await res.arrayBuffer());
      } else {
        const base64Data = photo.editedUrl!.split(",")[1];
        buffer = Buffer.from(base64Data, "base64");
      }

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `attachment; filename="${sanitizedAddress}_001.jpg"`,
        },
      });
    }

    // For multiple photos without ?format=zip, return a JSON manifest with download links
    const photoLinks = job.photos.map((photo, index) => ({
      id: photo.id,
      index: index + 1,
      filename: `${job.address.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50)}_${String(index + 1).padStart(3, "0")}.jpg`,
      downloadUrl: `/api/jobs/${jobId}/photos/${photo.id}/download`,
    }));

    return NextResponse.json({
      jobId,
      address: job.address,
      totalPhotos: job.photos.length,
      photos: photoLinks,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
