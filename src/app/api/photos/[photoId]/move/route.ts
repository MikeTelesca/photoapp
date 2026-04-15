import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * POST /api/photos/[photoId]/move
 * Body: { targetJobId: string, mode: "copy" | "move" }
 *
 * - copy: creates a new Photo row in the target job that references the same
 *   originalUrl/editedUrl/thumbnailUrl as the source.
 * - move: updates photo.jobId to the target job.
 *
 * Requires the caller to own (or be admin for) BOTH the source and target job.
 * Target job's aggregate counts (totalPhotos / processedPhotos / approvedPhotos /
 * rejectedPhotos / twilightCount) are kept in sync. Source job's counts are
 * adjusted on "move".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  let body: { targetJobId?: string; mode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetJobId = typeof body.targetJobId === "string" ? body.targetJobId.trim() : "";
  const mode = body.mode;
  if (!targetJobId) {
    return NextResponse.json({ error: "targetJobId is required" }, { status: 400 });
  }
  if (mode !== "copy" && mode !== "move") {
    return NextResponse.json(
      { error: 'mode must be "copy" or "move"' },
      { status: 400 }
    );
  }

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  if (photo.jobId === targetJobId) {
    return NextResponse.json(
      { error: "Source and target job are the same" },
      { status: 400 }
    );
  }

  // Load both jobs and verify ownership (admins bypass ownership check).
  const [sourceJob, targetJob] = await Promise.all([
    prisma.job.findUnique({
      where: { id: photo.jobId },
      select: { id: true, photographerId: true, deletedAt: true },
    }),
    prisma.job.findUnique({
      where: { id: targetJobId },
      select: { id: true, photographerId: true, deletedAt: true },
    }),
  ]);

  if (!sourceJob || sourceJob.deletedAt) {
    return NextResponse.json({ error: "Source job not found" }, { status: 404 });
  }
  if (!targetJob || targetJob.deletedAt) {
    return NextResponse.json({ error: "Target job not found" }, { status: 404 });
  }

  if (auth.role !== "admin") {
    if (sourceJob.photographerId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden (source job)" }, { status: 403 });
    }
    if (targetJob.photographerId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden (target job)" }, { status: 403 });
    }
  }

  const isTwilight = photo.isTwilight ? 1 : 0;
  const isProcessed =
    photo.status === "edited" || photo.status === "approved" || photo.status === "rejected"
      ? 1
      : 0;
  const isApproved = photo.status === "approved" ? 1 : 0;
  const isRejected = photo.status === "rejected" ? 1 : 0;

  if (mode === "copy") {
    // Determine next orderIndex in the target job.
    const maxOrder = await prisma.photo.findFirst({
      where: { jobId: targetJobId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });
    const nextOrderIndex = (maxOrder?.orderIndex ?? -1) + 1;

    const [newPhoto] = await prisma.$transaction([
      prisma.photo.create({
        data: {
          jobId: targetJobId,
          orderIndex: nextOrderIndex,
          status: photo.status,
          originalUrl: photo.originalUrl,
          editedUrl: photo.editedUrl,
          thumbnailUrl: photo.thumbnailUrl,
          isExterior: photo.isExterior,
          isTwilight: photo.isTwilight,
          isFavorite: photo.isFavorite,
          favorited: photo.favorited,
          flagged: photo.flagged,
          twilightInstructions: photo.twilightInstructions,
          twilightStyle: photo.twilightStyle,
          customInstructions: photo.customInstructions,
          customPromptOverride: photo.customPromptOverride,
          retouchRequest: photo.retouchRequest,
          detections: photo.detections,
          bracketGroup: photo.bracketGroup,
          bracketIndex: photo.bracketIndex,
          exifData: photo.exifData,
          fileSizeBytes: photo.fileSizeBytes,
          widthPx: photo.widthPx,
          heightPx: photo.heightPx,
          qualityFlags: photo.qualityFlags,
          autoTags: photo.autoTags,
          caption: photo.caption,
          customFilename: photo.customFilename,
          colorLabel: photo.colorLabel,
        },
      }),
      prisma.job.update({
        where: { id: targetJobId },
        data: {
          totalPhotos: { increment: 1 },
          processedPhotos: { increment: isProcessed },
          approvedPhotos: { increment: isApproved },
          rejectedPhotos: { increment: isRejected },
          twilightCount: { increment: isTwilight },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, mode: "copy", photoId: newPhoto.id });
  }

  // mode === "move"
  await prisma.$transaction([
    prisma.photo.update({
      where: { id: photoId },
      data: { jobId: targetJobId },
    }),
    prisma.job.update({
      where: { id: sourceJob.id },
      data: {
        totalPhotos: { decrement: 1 },
        processedPhotos: { decrement: isProcessed },
        approvedPhotos: { decrement: isApproved },
        rejectedPhotos: { decrement: isRejected },
        twilightCount: { decrement: isTwilight },
      },
    }),
    prisma.job.update({
      where: { id: targetJobId },
      data: {
        totalPhotos: { increment: 1 },
        processedPhotos: { increment: isProcessed },
        approvedPhotos: { increment: isApproved },
        rejectedPhotos: { increment: isRejected },
        twilightCount: { increment: isTwilight },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, mode: "move", photoId });
}
