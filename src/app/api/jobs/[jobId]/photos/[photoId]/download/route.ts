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

    if (photo.editedUrl.startsWith("http")) {
      // Redirect to Dropbox download URL
      return NextResponse.redirect(photo.editedUrl);
    }

    // Otherwise fall back to base64 decode
    const base64Data = photo.editedUrl.split(",")[1];
    if (!base64Data) {
      return NextResponse.json(
        { error: "Invalid photo data" },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(base64Data, "base64");
    const sanitizedAddress = photo.job.address
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 50);
    const filename = `${sanitizedAddress}_${String(photo.orderIndex + 1).padStart(3, "0")}.jpg`;

    return new NextResponse(buffer, {
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
