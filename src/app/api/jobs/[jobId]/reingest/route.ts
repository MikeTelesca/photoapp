import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = access.job;
  if (!job || !(job as any).dropboxUrl) {
    return NextResponse.json({ error: "Job has no Dropbox URL" }, { status: 400 });
  }

  const token = process.env.DROPBOX_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "Dropbox not configured" }, { status: 500 });

  // List files (with subfolder support, same as ingest)
  const listResponse = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ path: "", shared_link: { url: (job as any).dropboxUrl }, limit: 2000 }),
  });

  if (!listResponse.ok) {
    return NextResponse.json({ error: "Failed to list Dropbox" }, { status: 500 });
  }

  const data = await listResponse.json();
  let allEntries = [...data.entries];

  const folders = data.entries.filter((e: any) => e[".tag"] === "folder");
  for (const folder of folders) {
    try {
      const subRes = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ path: folder.path_lower || folder.path_display, shared_link: { url: (job as any).dropboxUrl }, limit: 2000 }),
      });
      if (subRes.ok) {
        const sub = await subRes.json();
        allEntries.push(...sub.entries);
      }
    } catch {}
  }

  const imageFiles = allEntries
    .filter((e: any) => {
      if (e[".tag"] !== "file") return false;
      const ext = e.name.toLowerCase().slice(e.name.lastIndexOf("."));
      return IMAGE_EXTENSIONS.includes(ext);
    })
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  // Get existing photos for this job
  const existingPhotos = await prisma.photo.findMany({
    where: { jobId },
    select: { exifData: true, orderIndex: true },
  });

  // Extract filenames already in the job
  const existingFileNames = new Set<string>();
  for (const p of existingPhotos) {
    try {
      const exif = JSON.parse(p.exifData || "{}");
      for (const f of (exif.photos || [])) {
        existingFileNames.add(f.fileName);
      }
    } catch {}
  }

  // Find new files
  const newFiles = imageFiles.filter((f: any) => !existingFileNames.has(f.name));

  if (newFiles.length === 0) {
    return NextResponse.json({ added: 0, message: "No new files in Dropbox" });
  }

  // Group new files into brackets
  const bracketCount = newFiles.length % 5 === 0 ? 5 : 3;
  const newGroupCount = Math.ceil(newFiles.length / bracketCount);
  const startOrderIndex = (Math.max(0, ...existingPhotos.map(p => p.orderIndex)) + 1) || 0;

  const newPhotoRecords = [];
  for (let g = 0; g < newGroupCount; g++) {
    const startIdx = g * bracketCount;
    const groupFiles = newFiles.slice(startIdx, startIdx + bracketCount);

    newPhotoRecords.push({
      jobId,
      orderIndex: startOrderIndex + g,
      status: "pending",
      bracketGroup: existingPhotos.length + g,
      bracketIndex: groupFiles.length,
      exifData: JSON.stringify({
        bracketCount: groupFiles.length,
        photos: groupFiles.map((f: any) => ({
          fileName: f.name,
          path: f.path_lower || f.path_display || "",
          size: f.size || 0,
        })),
      }),
      isExterior: false,
      isTwilight: false,
    });
  }

  await prisma.photo.createMany({ data: newPhotoRecords });

  await prisma.job.update({
    where: { id: jobId },
    data: { totalPhotos: { increment: newGroupCount }, status: "review" },
  });

  return NextResponse.json({
    added: newGroupCount,
    newFiles: newFiles.length,
    message: `Added ${newGroupCount} new photo groups (${newFiles.length} new source files)`,
  });
}
