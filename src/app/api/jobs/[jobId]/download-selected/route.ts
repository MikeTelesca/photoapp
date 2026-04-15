import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import JSZip from "jszip";
import { applyPattern } from "@/lib/filename-pattern";

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No ids provided" }, { status: 400 });
  }

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
    where: { id: { in: ids }, jobId },
    orderBy: { orderIndex: "asc" },
  });

  if (photos.length === 0) {
    return NextResponse.json({ error: "No matching photos" }, { status: 400 });
  }

  // Get user's filename pattern
  const user = job.photographer;
  const pattern = user?.filenamePattern || "{address}-{seq}";

  const zip = new JSZip();
  let idx = 0;
  for (const photo of photos) {
    const url = photo.editedUrl || photo.originalUrl;
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      idx++;
      const filename = applyPattern({
        pattern,
        address: job.address,
        client: job.clientName || "",
        preset: job.preset || "",
        photographer: user?.name || "",
        index: idx,
        total: photos.length,
      });
      zip.file(filename, buf);
    } catch (err) {
      console.error("zip err:", err);
    }
  }

  if (idx === 0) {
    return NextResponse.json(
      { error: "No photos could be fetched" },
      { status: 500 }
    );
  }

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const addr = job.address.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${addr}-selected.zip"`,
    },
  });
}
