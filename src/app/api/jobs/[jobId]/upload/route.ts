import { NextRequest, NextResponse } from "next/server";
import { requireJobAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { uploadInternalFile, createFolder, sanitizeFolderName } from "@/lib/dropbox";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

// POST /api/jobs/:jobId/upload — accepts one or more images in multipart/form-data
// and uploads each to Dropbox. Returns the stored path + size + filename per
// file so the client can call /ingest-uploaded afterwards to register them as
// Photo rows (with bracket grouping).
//
// Client should call this ONE FILE AT A TIME on Vercel hobby (4.5MB body cap).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { agent: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err: unknown) {
    log.warn("upload.invalid_form_data", {
      jobId,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const allFiles = [...formData.getAll("files"), ...formData.getAll("file")];
  const files = allFiles.filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // Decide the Dropbox destination folder. If the job has an agent with a
  // Dropbox folder (standard flow from new-job-modal), put the photos in the
  // per-property subfolder. Otherwise fall back to a per-job uploads folder.
  const folderPath = job.agent?.dropboxFolder
    ? `${job.agent.dropboxFolder}/${sanitizeFolderName(job.address)}`
    : `/BatchBase/_uploads/${jobId}`;

  try {
    await createFolder("/BatchBase");
  } catch {
    /* non-fatal */
  }
  if (folderPath.startsWith("/BatchBase/_uploads/")) {
    try {
      await createFolder("/BatchBase/_uploads");
    } catch {
      /* non-fatal */
    }
  }
  try {
    await createFolder(folderPath);
  } catch (err) {
    log.warn("upload.create_folder_failed", {
      jobId,
      folderPath,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  const uploaded: Array<{ name: string; size: number; path: string }> = [];
  const skipped: Array<{ name: string; reason: string }> = [];

  for (const file of files) {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!IMAGE_EXTENSIONS.includes(ext)) {
      skipped.push({ name: file.name, reason: "unsupported extension" });
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `${folderPath}/${file.name}`;

    try {
      const res = await uploadInternalFile(buffer, filePath);
      uploaded.push({ name: file.name, size: res.size || file.size, path: res.path });
    } catch (err: unknown) {
      log.error("upload.dropbox_failed", {
        jobId,
        fileName: file.name,
        err: err instanceof Error ? err.message : String(err),
      });
      skipped.push({
        name: file.name,
        reason: err instanceof Error ? err.message : "upload failed",
      });
    }
  }

  return NextResponse.json({
    uploaded,
    skipped,
    folderPath,
  });
}
