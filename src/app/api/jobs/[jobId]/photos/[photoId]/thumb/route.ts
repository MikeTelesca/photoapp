import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import crypto from "crypto";

type Variant = "best" | "edited" | "original";
type Size = "thumb" | "large";

const SIZE_BOUNDS: Record<Size, { w: number; h: number; quality: number }> = {
  thumb: { w: 640, h: 640, quality: 78 },
  large: { w: 2048, h: 2048, quality: 88 },
};

// GET /api/jobs/:jobId/photos/:photoId/thumb?variant=best|edited|original&size=thumb|large
//
// Decodes a base64 data URL or fetches an http URL, resizes with sharp, and
// returns a JPEG with aggressive cache headers. This is the one image endpoint
// the job grid + viewer use so the client never has to download raw data URLs
// that live in the DB.
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
  if (!source) return NextResponse.json({ error: "No image" }, { status: 404 });

  let sourceBuf: Buffer | null = null;
  try {
    if (source.startsWith("data:")) {
      const comma = source.indexOf(",");
      if (comma === -1) throw new Error("Invalid data URL");
      sourceBuf = Buffer.from(source.slice(comma + 1), "base64");
    } else if (source.startsWith("http")) {
      const res = await fetch(source);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      sourceBuf = Buffer.from(await res.arrayBuffer());
    }
  } catch {
    return NextResponse.json({ error: "Source unreachable" }, { status: 502 });
  }

  if (!sourceBuf) return NextResponse.json({ error: "No image" }, { status: 404 });

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
