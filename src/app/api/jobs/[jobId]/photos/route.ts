import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

// GET /api/jobs/:jobId/photos - list photos for a job.
//
// Only short URLs (http[s]) are returned in *Url fields. Data URLs remain in
// the DB for legacy rows but are stripped from the wire — the grid falls back
// to /api/.../thumb when no http URL is present.
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
      bracketIndex: true,
      exifData: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const photos = raw.map((p) => ({
    id: p.id,
    orderIndex: p.orderIndex,
    status: p.status,
    originalUrl: shortUrl(p.originalUrl),
    editedUrl: shortUrl(p.editedUrl),
    thumbnailUrl: shortUrl(p.thumbnailUrl),
    hasOriginal: !!p.originalUrl,
    hasEdited: !!p.editedUrl,
    hasThumbnail: !!p.thumbnailUrl,
    errorMessage: p.errorMessage,
    bracketCount: bracketCountFrom(p.bracketIndex, p.exifData),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return NextResponse.json(photos);
}

function shortUrl(v: string | null): string | null {
  if (!v) return null;
  if (v.startsWith("data:")) return null;
  return v;
}

// `bracketIndex` holds the file count per the ingest writer, but fall back to
// counting exifData.photos if it isn't set.
function bracketCountFrom(bracketIndex: number | null, exifData: string | null): number {
  if (typeof bracketIndex === "number" && bracketIndex > 0) return bracketIndex;
  if (!exifData) return 1;
  try {
    const parsed: unknown = JSON.parse(exifData);
    if (
      parsed &&
      typeof parsed === "object" &&
      "photos" in parsed &&
      Array.isArray((parsed as { photos: unknown[] }).photos)
    ) {
      return (parsed as { photos: unknown[] }).photos.length || 1;
    }
  } catch {
    // ignore parse failures — default to single-shot
  }
  return 1;
}
