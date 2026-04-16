import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

// Fields that the client is allowed to update via PATCH. Server trusts
// nothing else from the request body.
const ALLOWED_STRING_FIELDS = [
  "status",
  "note",
  "customInstructions",
  "editedUrl",
] as const;

// Fields where "" or null means "clear the per-photo override and fall back
// to the parent Job's setting".
const ALLOWED_OVERRIDE_FIELDS = [
  "preset",
  "tvStyle",
  "skyStyle",
  "seasonalStyle",
] as const;

const ALLOWED_BOOL_FIELDS = ["isTwilight"] as const;

// Statuses we bounce back to "pending" when a per-photo override changes —
// the client will typically follow up with a re-enhance.
const RESET_STATUSES = new Set(["edited", "approved", "rejected"]);

type UpdateBody = Partial<Record<
  | (typeof ALLOWED_STRING_FIELDS)[number]
  | (typeof ALLOWED_OVERRIDE_FIELDS)[number]
  | (typeof ALLOWED_BOOL_FIELDS)[number],
  unknown
>>;

// PATCH /api/jobs/:jobId/photos/:photoId - update a photo (approve, reject,
// adjust per-photo overrides, etc).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const body = (await request.json()) as UpdateBody;

  // Mass assignment defense: whitelist allowed fields.
  const updates: Record<string, string | boolean | null> = {};

  for (const field of ALLOWED_STRING_FIELDS) {
    const v = body[field];
    if (v === undefined) continue;
    if (v === null || typeof v === "string") updates[field] = v as string | null;
  }

  for (const field of ALLOWED_BOOL_FIELDS) {
    const v = body[field];
    if (v === undefined) continue;
    if (typeof v === "boolean") updates[field] = v;
  }

  // Override fields: empty string or null both mean "clear override".
  let overrideChanged = false;
  for (const field of ALLOWED_OVERRIDE_FIELDS) {
    const v = body[field];
    if (v === undefined) continue;
    const normalized =
      v === null || (typeof v === "string" && v.trim() === "")
        ? null
        : typeof v === "string"
          ? v
          : null;
    updates[field] = normalized;
    overrideChanged = true;
  }

  // Verify photo belongs to this job to prevent cross-job tampering.
  const existing = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!existing || existing.jobId !== jobId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If any override changed and the photo already has a resolved status,
  // drop back to "pending" so it's obvious it's queued for a re-enhance.
  if (overrideChanged && updates.status === undefined && RESET_STATUSES.has(existing.status)) {
    updates.status = "pending";
  }

  const photo = await prisma.photo.update({
    where: { id: photoId },
    data: updates,
  });

  // Update job counts using efficient count queries.
  const [approvedCount, rejectedCount, processedCount] = await Promise.all([
    prisma.photo.count({ where: { jobId: photo.jobId, status: "approved" } }),
    prisma.photo.count({ where: { jobId: photo.jobId, status: "rejected" } }),
    prisma.photo.count({
      where: {
        jobId: photo.jobId,
        status: { notIn: ["pending", "processing"] },
      },
    }),
  ]);

  const job = await prisma.job.findUnique({ where: { id: photo.jobId } });
  if (job) {
    await prisma.job.update({
      where: { id: job.id },
      data: {
        approvedPhotos: approvedCount,
        rejectedPhotos: rejectedCount,
        processedPhotos: processedCount,
        status:
          approvedCount + rejectedCount === job.totalPhotos && job.totalPhotos > 0
            ? "approved"
            : job.status,
      },
    });
  }

  void access;
  return NextResponse.json(photo);
}
