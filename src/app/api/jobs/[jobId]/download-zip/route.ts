import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import JSZip from "jszip";
import { applyPattern } from "@/lib/filename-pattern";
import { logDownload } from "@/lib/download-log";
import sharp from "sharp";

export const maxDuration = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const format = request.nextUrl.searchParams.get("format") || "jpeg-90";
  // Supported formats: jpeg-75, jpeg-85, jpeg-90, jpeg-95, png

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      photographer: {
        select: { filenamePattern: true, name: true },
      },
    },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = await prisma.photo.findMany({
    where: { jobId, status: "approved" },
    orderBy: { orderIndex: "asc" },
  });

  if (photos.length === 0) {
    return NextResponse.json(
      { error: "No approved photos to download" },
      { status: 400 }
    );
  }

  // Also fetch any photos with retouch requests (including non-approved),
  // so notes aren't dropped from the delivery package.
  const photosWithRetouch = await prisma.photo.findMany({
    where: { jobId, retouchRequest: { not: null } },
    orderBy: { orderIndex: "asc" },
    select: { id: true, orderIndex: true, retouchRequest: true },
  });

  const zip = new JSZip();
  const user = job.photographer;
  const pattern = user?.filenamePattern || "{address}-{seq}";

  let idx = 0;
  const retouchLines: string[] = [];
  const retouchedPhotoIdsIncluded = new Set<string>();
  for (const photo of photos) {
    const url = photo.editedUrl || photo.originalUrl;
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const arrayBuf = await res.arrayBuffer();
      let buf = Buffer.from(arrayBuf);
      idx++;

      // Re-encode based on requested format
      let extension = "jpg";
      if (format === "png") {
        const encoded = await sharp(buf).png({ quality: 95 }).toBuffer();
        buf = Buffer.from(encoded);
        extension = "png";
      } else if (format.startsWith("jpeg-")) {
        const quality = parseInt(format.slice(5)) || 90;
        const encoded = await sharp(buf).jpeg({ quality, mozjpeg: true }).toBuffer();
        buf = Buffer.from(encoded);
        extension = "jpg";
      }

      // Apply filename pattern and replace extension
      let filename = applyPattern({
        pattern,
        address: job.address,
        client: job.clientName || "",
        preset: job.preset || "",
        photographer: user?.name || "",
        index: idx,
        total: photos.length,
      });
      // Replace extension in case pattern includes one
      filename = filename.replace(/\.[^/.]+$/, `.${extension}`);

      zip.file(filename, buf);

      if (photo.retouchRequest && photo.retouchRequest.trim().length > 0) {
        retouchLines.push(`${filename}: ${photo.retouchRequest.trim()}`);
        retouchedPhotoIdsIncluded.add(photo.id);
      }
    } catch (err) {
      console.error("zip fetch error:", err);
    }
  }

  if (idx === 0) {
    return NextResponse.json(
      { error: "No photos could be fetched" },
      { status: 500 }
    );
  }

  // Include retouch requests from non-approved photos too, so notes aren't lost.
  for (const p of photosWithRetouch) {
    if (!p.retouchRequest) continue;
    if (retouchedPhotoIdsIncluded.has(p.id)) continue;
    retouchLines.push(
      `photo-#${p.orderIndex + 1} (not in export): ${p.retouchRequest.trim()}`
    );
  }

  if (retouchLines.length > 0) {
    const header = [
      `Retouch requests for ${job.address}`,
      `Generated: ${new Date().toISOString()}`,
      `Total: ${retouchLines.length}`,
      "",
    ].join("\n");
    zip.file("retouch-requests.txt", header + retouchLines.join("\n") + "\n");
  }

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  await logDownload({
    userId: access.userId,
    jobId,
    type: "zip",
    count: idx,
  }).catch(() => {});

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${job.address}-photos.zip"`,
    },
  });
}
