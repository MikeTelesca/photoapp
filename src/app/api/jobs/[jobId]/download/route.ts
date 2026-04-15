import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

// GET /api/jobs/:jobId/download - download approved photos as individual files or ZIP
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

    // For a single photo, return it directly
    if (job.photos.length === 1) {
      const photo = job.photos[0];
      const base64Data = photo.editedUrl!.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");
      const sanitizedAddress = job.address
        .replace(/[^a-zA-Z0-9]/g, "_")
        .substring(0, 50);

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `attachment; filename="${sanitizedAddress}_001.jpg"`,
        },
      });
    }

    // For multiple photos, return a JSON manifest with download links
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
