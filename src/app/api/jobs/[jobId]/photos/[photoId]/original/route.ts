import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import crypto from "crypto";

// GET /api/jobs/:jobId/photos/:photoId/original - serve original photo from Dropbox
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  try {
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!photo || !job || !job.dropboxUrl) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get the first file path from the bracket group
    let filePath = "";
    try {
      const exif = JSON.parse(photo.exifData || "{}");
      // Use just the filename with leading slash — path is relative to the shared folder
      const fileName = exif?.photos?.[0]?.fileName;
      if (!fileName) throw new Error("No filename");
      filePath = `/${fileName.toLowerCase()}`;
    } catch {
      return NextResponse.json({ error: "No file path" }, { status: 400 });
    }

    const token = process.env.DROPBOX_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Dropbox not configured" }, { status: 500 });
    }

    // Download from Dropbox using sharing API
    const response = await fetch("https://content.dropboxapi.com/2/sharing/get_shared_link_file", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({
          url: job.dropboxUrl,
          path: filePath,
        }),
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Dropbox download error:", errText);
      return NextResponse.json({ error: "Failed to download from Dropbox" }, { status: 500 });
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Resize to display size for fast loading (preserves quality at typical screen sizes)
    // Browser caches aggressively so subsequent loads are instant
    const sharp = (await import("sharp")).default;
    const resized = await sharp(imageBuffer)
      .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    // Generate ETag from buffer content for conditional requests
    const etag = `"${crypto.createHash("md5").update(resized).digest("hex")}"`;

    // Return 304 if client already has this version
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    return new NextResponse(new Uint8Array(resized), {
      headers: {
        "Content-Type": "image/jpeg",
        // Cache for 7 days - photos rarely change, browser will use cached version
        "Cache-Control": "public, max-age=604800, immutable",
        "ETag": etag,
      },
    });
  } catch (error: any) {
    console.error("Original photo error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
