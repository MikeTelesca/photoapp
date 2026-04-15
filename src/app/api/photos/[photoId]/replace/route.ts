import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { uploadToDropbox } from "@/lib/dropbox";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];
const MAX_BYTES = 50 * 1024 * 1024; // 50MB

// POST /api/photos/:photoId/replace - replace a photo's source image (multipart/form-data; field: "file")
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Non-admin users: ensure the photo's job belongs to them
  if (auth.role !== "admin") {
    const job = await prisma.job.findUnique({
      where: { id: photo.jobId },
      select: { photographerId: true },
    });
    if (!job || job.photographerId !== auth.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  let file: File | null;
  try {
    const formData = await request.formData();
    file = formData.get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  if (!file || typeof (file as any).arrayBuffer !== "function") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const rawName = (file.name || "").toLowerCase();
  const dotIdx = rawName.lastIndexOf(".");
  const ext = dotIdx >= 0 ? rawName.slice(dotIdx) : "";
  if (!IMAGE_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: "Unsupported file type. Must be .jpg, .jpeg, or .png" },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeExt = ext === ".jpeg" ? ".jpg" : ext;
  const dropboxPath = `/PhotoApp/uploads/${photo.jobId}/replacements/${photoId}-${Date.now()}${safeExt}`;

  let shareUrl: string;
  try {
    shareUrl = await uploadToDropbox(buffer, dropboxPath);
  } catch (err: any) {
    console.error("[replace] Dropbox upload failed:", err);
    return NextResponse.json(
      { error: `Upload failed: ${err?.message || "unknown error"}` },
      { status: 500 }
    );
  }

  const updated = await prisma.photo.update({
    where: { id: photoId },
    data: {
      originalUrl: shareUrl,
      editedUrl: null,
      status: "pending",
      errorMessage: null,
      errorAttempts: 0,
      retryCount: 0,
      fileSizeBytes: buffer.length,
    },
    select: {
      id: true,
      originalUrl: true,
      editedUrl: true,
      status: true,
    },
  });

  // Log activity (model exists in schema)
  try {
    await logActivity({
      type: "photo_source_replaced",
      message: `Source image replaced for photo ${photoId}`,
      jobId: photo.jobId,
      photoId,
      userId: auth.userId,
      metadata: {
        filename: file.name,
        size: buffer.length,
        dropboxPath,
      },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ photo: updated });
}
