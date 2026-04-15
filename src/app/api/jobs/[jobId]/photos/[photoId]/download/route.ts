import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { applyWatermark } from "@/lib/watermark";
import { applyPattern } from "@/lib/filename-pattern";
import { logDownload } from "@/lib/download-log";

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
      include: {
        job: {
          include: {
            photographer: {
              select: { watermarkLogoPath: true, name: true, filenamePattern: true },
            },
          },
        },
      },
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
    const watermarkLogoPath = photo.job.photographer?.watermarkLogoPath || null;
    const hasWatermark = watermarkText?.trim().length || watermarkLogoPath;

    if (hasWatermark) {
      buffer = await applyWatermark(buffer, {
        watermarkText: watermarkText,
        watermarkPosition: (photo.job as any).watermarkPosition || "bottom-right",
        watermarkSize: (photo.job as any).watermarkSize || 32,
        watermarkOpacity: (photo.job as any).watermarkOpacity ?? 0.7,
        watermarkLogoPath: watermarkLogoPath,
      });

      // Convert to JPEG
      const sharp = (await import("sharp")).default;
      buffer = await sharp(buffer).jpeg({ quality: 92 }).toBuffer();
    }

    const user = photo.job.photographer;
    const pattern = user?.filenamePattern || "{address}-{seq}";
    const filename = applyPattern({
      pattern,
      address: photo.job.address,
      client: photo.job.clientName || "",
      preset: photo.job.preset || "",
      photographer: user?.name || "",
      index: photo.orderIndex + 1,
      total: 1,
    });

    await logDownload({
      userId: access.userId,
      jobId,
      photoId,
      type: "single",
    }).catch(() => {});

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
