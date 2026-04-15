import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import JSZip from "jszip";
import { logDownload } from "@/lib/download-log";

export const maxDuration = 300;

function extractFilename(url: string, fallback: string): string {
  try {
    const u = new URL(url);
    const pathname = u.pathname;
    const last = pathname.split("/").filter(Boolean).pop() || "";
    const decoded = decodeURIComponent(last);
    if (decoded && /\.[A-Za-z0-9]{2,5}$/.test(decoded)) {
      return decoded.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_");
    }
  } catch {
    // ignore
  }
  return fallback;
}

function dedupe(filename: string, used: Set<string>): string {
  if (!used.has(filename)) {
    used.add(filename);
    return filename;
  }
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : "";
  let i = 1;
  while (used.has(`${base}-${i}${ext}`)) i++;
  const next = `${base}-${i}${ext}`;
  used.add(next);
  return next;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, address: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = await prisma.photo.findMany({
    where: { jobId, originalUrl: { not: null } },
    orderBy: { orderIndex: "asc" },
    select: { id: true, orderIndex: true, originalUrl: true },
  });

  if (photos.length === 0) {
    return NextResponse.json(
      { error: "No originals available to download" },
      { status: 400 }
    );
  }

  const zip = new JSZip();
  const used = new Set<string>();
  let added = 0;

  for (const photo of photos) {
    const url = photo.originalUrl;
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);

      const seq = String(photo.orderIndex + 1).padStart(3, "0");
      const fallback = `original-${seq}.jpg`;
      let filename = extractFilename(url, fallback);
      filename = dedupe(filename, used);

      zip.file(filename, buf);
      added++;
    } catch (err) {
      console.error("download-originals fetch error:", err);
    }
  }

  if (added === 0) {
    return NextResponse.json(
      { error: "No originals could be fetched" },
      { status: 500 }
    );
  }

  const readme = [
    `Originals for: ${job.address}`,
    `Generated: ${new Date().toISOString()}`,
    `File count: ${added}`,
    "",
    "This ZIP contains the SOURCE ORIGINAL photos as uploaded to the job.",
    "These are NOT the AI-edited or retouched files.",
    "For the delivered/edited versions, use the \"Download ZIP\" option instead.",
    "",
  ].join("\n");
  zip.file("README.txt", readme);

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  await logDownload({
    userId: access.userId,
    jobId,
    type: "zip",
    count: added,
  }).catch(() => {});

  const safeAddress = (job.address || "job").replace(/[\\/:*?"<>|\x00-\x1f]/g, "_");
  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeAddress}-originals.zip"`,
    },
  });
}
