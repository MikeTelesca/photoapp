import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { downloadViaTemporaryLink, getTemporaryLink } from "@/lib/dropbox";
import crypto from "crypto";

type Variant = "best" | "edited" | "original";
type Size = "thumb" | "large";

const SIZE_BOUNDS: Record<Size, { w: number; h: number; quality: number }> = {
  thumb: { w: 640, h: 640, quality: 78 },
  large: { w: 2048, h: 2048, quality: 88 },
};

// GET /api/jobs/:jobId/photos/:photoId/thumb?variant=best|edited|original&size=thumb|large
//
// Resolution order for the source image:
//   1. Photo.editedUrl / originalUrl / thumbnailUrl (http URL → 302 redirect)
//   2. Same fields as base64 data URL → decode + resize
//   3. exifData.photos[N].path on Dropbox → temp link
//         - size=large → 302 redirect to the temp link
//         - size=thumb → fetch + resize + return with 7-day cache
//
// This means freshly-ingested bracket groups (which only have paths, no URLs)
// still render in the grid.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const url = new URL(request.url);
  const variant = (url.searchParams.get("variant") ?? "best") as Variant;
  const size = (url.searchParams.get("size") ?? "thumb") as Size;
  const bounds = SIZE_BOUNDS[size] ?? SIZE_BOUNDS.thumb;

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const source = pickSource(photo, variant);

  // http URL: redirect to origin (Dropbox CDN); browser caches against that URL
  if (source?.startsWith("http")) {
    return NextResponse.redirect(source, { status: 302 });
  }

  // Data URL: decode + resize with sharp
  if (source?.startsWith("data:")) {
    try {
      const comma = source.indexOf(",");
      if (comma === -1) throw new Error("Invalid data URL");
      const sourceBuf = Buffer.from(source.slice(comma + 1), "base64");
      return await resizeAndRespond(request, sourceBuf, bounds);
    } catch {
      return NextResponse.json({ error: "Source unreachable" }, { status: 502 });
    }
  }

  // Dropbox-path fallback: pick one of the bracket exposures and serve it
  const dbxPath = pickDropboxPath(photo.exifData, variant);
  if (dbxPath) {
    try {
      if (size === "large") {
        const link = await getTemporaryLink(dbxPath);
        return NextResponse.redirect(link, { status: 302 });
      }
      const sourceBuf = await downloadViaTemporaryLink(dbxPath);
      return await resizeAndRespond(request, sourceBuf, bounds);
    } catch {
      return NextResponse.json({ error: "Dropbox fetch failed" }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "No image" }, { status: 404 });
}

async function resizeAndRespond(
  request: NextRequest,
  sourceBuf: Buffer,
  bounds: { w: number; h: number; quality: number }
) {
  const sharp = (await import("sharp")).default;
  const resized = await sharp(sourceBuf)
    .rotate()
    .resize(bounds.w, bounds.h, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: bounds.quality, mozjpeg: true })
    .toBuffer();

  const etag = `"${crypto.createHash("md5").update(resized).digest("hex")}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304 });
  }

  return new NextResponse(new Uint8Array(resized), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=604800, immutable",
      ETag: etag,
    },
  });
}

function pickSource(
  photo: { originalUrl: string | null; editedUrl: string | null; thumbnailUrl: string | null },
  variant: Variant
): string | null {
  if (variant === "edited") return photo.editedUrl ?? null;
  if (variant === "original") return photo.originalUrl ?? null;
  return photo.editedUrl ?? photo.thumbnailUrl ?? photo.originalUrl ?? null;
}

// For a bracket group, pick the middle exposure as the visual preview.
// 3-shot -> index 1 (normal); 5-shot -> index 2 (normal); 1-shot -> index 0.
function pickDropboxPath(exifData: string | null, variant: Variant): string | null {
  if (variant === "edited") return null; // edited versions come from editedUrl, not Dropbox paths
  if (!exifData) return null;
  try {
    const parsed: unknown = JSON.parse(exifData);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("photos" in parsed) ||
      !Array.isArray((parsed as { photos: unknown[] }).photos)
    ) {
      return null;
    }
    const files = (parsed as { photos: Array<{ path?: string }> }).photos;
    if (files.length === 0) return null;
    const idx = Math.floor(files.length / 2);
    return files[idx]?.path ?? files[0]?.path ?? null;
  } catch {
    return null;
  }
}
