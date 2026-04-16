import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import {
  listFilesFromSharedLink,
  downloadFileFromSharedLink,
  uploadInternalFile,
  createFolder,
  createShareLinkForPath,
  sanitizeFolderName,
} from "@/lib/dropbox";
import { detectJobTwilight } from "@/lib/twilight-detect";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/jobs/:jobId/ingest-from-link
//
// Pulls photos from a shooter's Dropbox shared-link folder, mirrors them into
// the editor's Dropbox under the agent's property subfolder, then creates
// Photo rows with bracket grouping.
//
// Body: { sourceUrl: string }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { agent: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sourceUrl =
    body && typeof body === "object" && "sourceUrl" in body && typeof (body as { sourceUrl: unknown }).sourceUrl === "string"
      ? ((body as { sourceUrl: string }).sourceUrl || "").trim()
      : "";

  if (!sourceUrl) {
    return NextResponse.json({ error: "sourceUrl is required" }, { status: 400 });
  }

  if (!sourceUrl.includes("dropbox.com")) {
    return NextResponse.json(
      { error: "Only Dropbox share links are supported right now. Google Drive coming soon." },
      { status: 400 },
    );
  }

  // Destination folder in the editor's Dropbox
  const destFolder = job.agent?.dropboxFolder
    ? `${job.agent.dropboxFolder}/${sanitizeFolderName(job.address)}`
    : `/BatchBase/_uploads/${jobId}`;

  try {
    await createFolder("/BatchBase");
  } catch {
    /* non-fatal */
  }
  if (destFolder.startsWith("/BatchBase/_uploads/")) {
    try {
      await createFolder("/BatchBase/_uploads");
    } catch {
      /* non-fatal */
    }
  }
  try {
    await createFolder(destFolder);
  } catch (err) {
    log.warn("ingest-from-link.create_folder_failed", {
      jobId,
      destFolder,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  // Enumerate source files
  let sourceFiles: Array<{ name: string; path: string; size: number }>;
  try {
    sourceFiles = await listFilesFromSharedLink(sourceUrl);
  } catch (err: unknown) {
    log.error("ingest-from-link.list_failed", {
      jobId,
      sourceUrl,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        error:
          "Couldn't read the source folder. Make sure the link is a Dropbox shared folder that anyone with the link can view.",
      },
      { status: 400 },
    );
  }

  if (sourceFiles.length === 0) {
    return NextResponse.json(
      { error: "Source folder has no supported image files" },
      { status: 400 },
    );
  }

  // Copy each file: download from source link → upload to destination folder
  const copied: Array<{ name: string; path: string; size: number }> = [];
  const failed: Array<{ name: string; reason: string }> = [];

  for (const file of sourceFiles) {
    try {
      const buffer = await downloadFileFromSharedLink(sourceUrl, `/${file.name}`);
      const destPath = `${destFolder}/${file.name}`;
      const res = await uploadInternalFile(buffer, destPath);
      copied.push({ name: file.name, path: res.path, size: file.size });
    } catch (err: unknown) {
      log.error("ingest-from-link.copy_failed", {
        jobId,
        fileName: file.name,
        err: err instanceof Error ? err.message : String(err),
      });
      failed.push({
        name: file.name,
        reason: err instanceof Error ? err.message : "copy failed",
      });
    }
  }

  if (copied.length === 0) {
    return NextResponse.json(
      { error: "All file transfers failed. Check the source link permissions.", failed },
      { status: 502 },
    );
  }

  // Ensure we have a share link to the DESTINATION folder for downstream tools
  let dropboxUrl: string | null = job.dropboxUrl;
  if (!dropboxUrl) {
    try {
      dropboxUrl = await createShareLinkForPath(destFolder);
    } catch (err) {
      log.warn("ingest-from-link.dest_share_link_failed", {
        jobId,
        destFolder,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Bracket grouping
  copied.sort((a, b) => a.name.localeCompare(b.name));
  const bracketCount =
    copied.length > 1 && copied.length % 5 === 0
      ? 5
      : copied.length > 1 && copied.length % 3 === 0
        ? 3
        : 1;
  const groupCount = Math.ceil(copied.length / bracketCount);

  await prisma.photo.deleteMany({ where: { jobId } });

  const photoRecords = [];
  for (let g = 0; g < groupCount; g += 1) {
    const startIdx = g * bracketCount;
    const groupFiles = copied.slice(startIdx, startIdx + bracketCount);
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
          size: f.size,
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

  log.info("ingest-from-link.ok", {
    jobId,
    copiedCount: copied.length,
    failedCount: failed.length,
    groupCount,
  });

  return NextResponse.json({
    copied: copied.length,
    failed: failed.length,
    added: groupCount,
    bracketCount,
    destFolder,
    failedFiles: failed,
  });
}
