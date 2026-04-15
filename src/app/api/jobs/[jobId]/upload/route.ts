import { NextRequest, NextResponse } from "next/server";
import { requireJobAccess } from "@/lib/api-auth";
import { uploadInternalFile } from "@/lib/dropbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

// POST /api/jobs/:jobId/upload - upload files directly (multipart/form-data)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;
  const job = access.job;
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploaded: Array<{ name: string; size: number; path: string }> = [];
    for (const file of files) {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      if (!IMAGE_EXTENSIONS.includes(ext)) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const dropboxPath = `/PhotoApp/uploads/${jobId}/${file.name}`;

      try {
        const result = await uploadInternalFile(buffer, dropboxPath);
        uploaded.push({ name: file.name, size: result.size, path: result.path });
      } catch (err) {
        console.error(`Upload failed for ${file.name}:`, err);
      }
    }

    return NextResponse.json({
      uploaded: uploaded.length,
      files: uploaded,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
