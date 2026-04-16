import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { detectJobTwilight } from "@/lib/twilight-detect";
import { createShareLinkForPath } from "@/lib/dropbox";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type UploadedFile = { name: string; path: string; size?: number };

// POST /api/jobs/:jobId/ingest-uploaded
//
// Called AFTER the client has uploaded each file individually via /upload.
// The body is a JSON list of files that now live in Dropbox. This endpoint:
//   1. Groups files into 3- or 5-shot brackets (by filename order)
//   2. Creates one Photo row per bracket group
//   3. Ensures job.dropboxUrl is a share link pointing at the property folder
//
// Request body: { files: [{ name, path, size? }, ...] }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("files" in body)) {
    return NextResponse.json({ error: "Missing files array" }, { status: 400 });
  }

  const rawFiles = (body as { files: unknown }).files;
  if (!Array.isArray(rawFiles) || rawFiles.length === 0) {
    return NextResponse.json({ error: "No files to ingest" }, { status: 400 });
  }

  const files: UploadedFile[] = rawFiles
    .filter(
      (f): f is UploadedFile =>
        !!f &&
        typeof f === "object" &&
        typeof (f as { name: unknown }).name === "string" &&
        typeof (f as { path: unknown }).path === "string"
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  if (files.length === 0) {
    return NextResponse.json({ error: "No valid file entries" }, { status: 400 });
  }

  // Figure out the parent folder path for share-link purposes. All files
  // should be in the same folder; take the directory of the first one.
  const firstPath = files[0].path;
  const folderPath = firstPath.substring(0, firstPath.lastIndexOf("/")) || "/";

  // Ensure job.dropboxUrl is a usable share link so downstream tools (enhance,
  // download-zip) can reach the photos through the sharing API.
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  let dropboxUrl: string | null = job.dropboxUrl;
  if (!dropboxUrl) {
    try {
      dropboxUrl = await createShareLinkForPath(folderPath);
    } catch (err: unknown) {
      log.warn("ingest-uploaded.share_link_failed", {
        jobId,
        folderPath,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Bracket grouping — 5 if divisible by 5, else 3 if divisible by 3, else 1
  const bracketCount =
    files.length > 1 && files.length % 5 === 0
      ? 5
      : files.length > 1 && files.length % 3 === 0
        ? 3
        : 1;
  const groupCount = Math.ceil(files.length / bracketCount);

  // Replace any existing photos for this job (upload is idempotent re-ingest)
  await prisma.photo.deleteMany({ where: { jobId } });

  const photoRecords = [];
  for (let g = 0; g < groupCount; g += 1) {
    const startIdx = g * bracketCount;
    const groupFiles = files.slice(startIdx, startIdx + bracketCount);
    photoRecords.push({
      jobId,
      orderIndex: g,
      status: "pending",
      bracketGroup: g,
      bracketIndex: groupFiles.length,
      exifData: JSON.stringify({
        bracketCount: groupFiles.length,
        photos: groupFiles.map((f) => ({
          fileName: f.name,
          path: f.path,
          size: f.size ?? 0,
        })),
      }),
      isExterior: false,
      isTwilight: false,
    });
  }

  await prisma.photo.createMany({ data: photoRecords });

  const isTwilight = detectJobTwilight(photoRecords.map((p) => p.exifData));
  const jobUpdateData: Record<string, string | number | null> = {
    totalPhotos: groupCount,
    processedPhotos: 0,
    status: "pending",
  };
  if (dropboxUrl && dropboxUrl !== job.dropboxUrl) {
    jobUpdateData.dropboxUrl = dropboxUrl;
  }
  if (isTwilight && !job.seasonalStyle) {
    jobUpdateData.seasonalStyle = "twilight";
  }
  await prisma.job.update({ where: { id: jobId }, data: jobUpdateData });

  log.info("ingest-uploaded.ok", {
    jobId,
    groupCount,
    fileCount: files.length,
    bracketCount,
  });

  return NextResponse.json({
    added: groupCount,
    files: files.length,
    bracketCount,
  });
}
