import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

// GET /api/jobs/:jobId/photos - list photos for a job.
//
// IMPORTANT: `originalUrl` / `editedUrl` / `thumbnailUrl` are stored as base64
// data URLs in the DB (potentially multiple megabytes each). Shipping those to
// the client blows the page up. We project lightweight boolean flags instead
// and expect the UI to request actual image bytes via the /thumb endpoint.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const raw = await prisma.photo.findMany({
    where: { jobId },
    orderBy: { orderIndex: "asc" },
    select: {
      id: true,
      orderIndex: true,
      status: true,
      originalUrl: true,
      editedUrl: true,
      thumbnailUrl: true,
      errorMessage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const photos = raw.map((p) => ({
    id: p.id,
    orderIndex: p.orderIndex,
    status: p.status,
    hasOriginal: !!p.originalUrl,
    hasEdited: !!p.editedUrl,
    hasThumbnail: !!p.thumbnailUrl,
    errorMessage: p.errorMessage,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return NextResponse.json(photos);
}
