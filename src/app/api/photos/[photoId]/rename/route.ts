import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

const MAX_FILENAME_LEN = 120;

/**
 * Sanitize a user-supplied filename base.
 *  - Strips path separators and characters that are invalid on Windows/macOS.
 *  - Collapses whitespace.
 *  - Removes leading/trailing dots and spaces.
 *  - Truncates to MAX_FILENAME_LEN.
 * Returns `null` if the result would be empty.
 */
function sanitizeFilename(raw: string): string | null {
  let s = raw.normalize("NFC");
  // Remove path separators and characters illegal on common filesystems
  s = s.replace(/[\\/:*?"<>|\x00-\x1f]/g, "");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  // Strip leading/trailing dots (hidden files / Windows weirdness)
  s = s.replace(/^\.+|\.+$/g, "").trim();
  if (s.length === 0) return null;
  if (s.length > MAX_FILENAME_LEN) s = s.slice(0, MAX_FILENAME_LEN);
  return s;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  let body: { filename?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body?.filename;
  let customFilename: string | null;
  if (raw === null || raw === undefined) {
    customFilename = null;
  } else if (typeof raw === "string") {
    if (raw.trim().length === 0) {
      customFilename = null;
    } else {
      customFilename = sanitizeFilename(raw);
      if (customFilename === null) {
        return NextResponse.json(
          { error: "Filename is empty after sanitization" },
          { status: 400 }
        );
      }
    }
  } else {
    return NextResponse.json(
      { error: "`filename` must be a string or null" },
      { status: 400 }
    );
  }

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

  const updated = await prisma.photo.update({
    where: { id: photoId },
    data: { customFilename },
    select: { customFilename: true },
  });

  return NextResponse.json({ customFilename: updated.customFilename });
}
