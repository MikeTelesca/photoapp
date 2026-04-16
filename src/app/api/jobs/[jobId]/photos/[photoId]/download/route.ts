import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

function decodeDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { buffer: Buffer.from(match[2], "base64"), mime: match[1] };
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]+/g, "_").replace(/^_+|_+$/g, "");
}

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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const source = photo.editedUrl ?? photo.originalUrl;
    if (!source) {
      return NextResponse.json({ error: "No image available" }, { status: 404 });
    }

    const decoded = decodeDataUrl(source);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid image data" }, { status: 500 });
    }

    const addressSlug = sanitize(photo.job.address) || "photo";
    const ext = decoded.mime.includes("png") ? "png" : "jpg";
    const fileName = `${addressSlug}_${photo.orderIndex + 1}.${ext}`;

    void access;
    void request;
    return new NextResponse(decoded.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": decoded.mime,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[photo-download] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
