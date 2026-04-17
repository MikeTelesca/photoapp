import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { downloadInternalFile } from "@/lib/dropbox";
import {
  createAutoenhanceOrder,
  registerAndUploadBracket,
  triggerAutoenhanceProcess,
} from "@/lib/autoenhance";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// POST /api/jobs/:jobId/enhance-batch
//
// Starts ONE Autoenhance order for the whole job. Uploads every bracket
// file from every pending/failed Photo row, tracks which bracket_ids belong
// to which Photo, then triggers visual auto-grouping. Client polls
// /enhance-poll afterwards to download + distribute results.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const rateErr = await checkRate(access.userId, "enhance");
  if (rateErr) return rateErr;

  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { agent: true } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // If there's already an active order for this job, don't start a new one.
  if (job.autoenhanceOrderId) {
    return NextResponse.json(
      {
        error:
          "An enhance batch is already in progress. Wait for it to finish, or cancel it from the job page.",
        orderId: job.autoenhanceOrderId,
      },
      { status: 409 },
    );
  }

  const photos = await prisma.photo.findMany({
    where: { jobId, status: { in: ["pending", "failed"] } },
    orderBy: { orderIndex: "asc" },
  });
  if (photos.length === 0) {
    return NextResponse.json({ error: "No pending photos to enhance" }, { status: 400 });
  }

  // Flatten: each bracket file across all photos, remembering which Photo.id
  // the file belongs to so we can reconcile outputs later.
  type Task = { photoId: string; fileName: string; path: string };
  const tasks: Task[] = [];
  for (const p of photos) {
    try {
      const exif = p.exifData ? JSON.parse(p.exifData) : null;
      const files = exif?.photos;
      if (!Array.isArray(files) || files.length === 0) continue;
      for (const f of files) {
        if (typeof f?.fileName === "string" && typeof f?.path === "string" && f.path) {
          tasks.push({ photoId: p.id, fileName: f.fileName, path: f.path });
        }
      }
    } catch {
      /* skip unparseable exif */
    }
  }
  if (tasks.length === 0) {
    return NextResponse.json({ error: "No bracket files to upload" }, { status: 400 });
  }

  log.info("enhance-batch.begin", { jobId, photoCount: photos.length, fileCount: tasks.length });

  // Create the order up front so we can roll back cleanly on failure.
  let orderId: string;
  try {
    orderId = await createAutoenhanceOrder();
  } catch (err: unknown) {
    log.error("enhance-batch.create_order_failed", {
      jobId,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create Autoenhance order" },
      { status: 502 },
    );
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      autoenhanceOrderId: orderId,
      enhanceStartedAt: new Date(),
      status: "processing",
    },
  });

  // Upload all bracket files to Autoenhance with concurrency 6. For each,
  // record the returned bracket_id + which Photo it belongs to.
  const bracketIdByPhoto = new Map<string, string[]>();
  const failures: Array<{ fileName: string; reason: string }> = [];
  const CONCURRENCY = 6;
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < tasks.length) {
      const idx = cursor;
      cursor += 1;
      const t = tasks[idx];
      try {
        const buf = await downloadInternalFile(t.path);
        const bracketId = await registerAndUploadBracket(orderId, t.fileName, buf);
        const list = bracketIdByPhoto.get(t.photoId) ?? [];
        list.push(bracketId);
        bracketIdByPhoto.set(t.photoId, list);
      } catch (err: unknown) {
        const msg = (err instanceof Error ? err.message : String(err)).slice(0, 300);
        log.warn("enhance-batch.bracket_upload_failed", {
          jobId,
          orderId,
          fileName: t.fileName,
          err: msg,
        });
        failures.push({ fileName: t.fileName, reason: msg });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker()));

  if (bracketIdByPhoto.size === 0) {
    log.error("enhance-batch.all_uploads_failed", { jobId, orderId, failures });
    await prisma.job.update({
      where: { id: jobId },
      data: { autoenhanceOrderId: null, enhanceStartedAt: null, status: "pending" },
    });
    return NextResponse.json(
      { error: "All bracket uploads to Autoenhance failed", failures },
      { status: 502 },
    );
  }

  // Persist bracket_id → photoId mapping + flip Photos to processing.
  await Promise.all(
    Array.from(bracketIdByPhoto.entries()).map(([photoId, ids]) =>
      prisma.photo.update({
        where: { id: photoId },
        data: {
          autoenhanceBracketIds: JSON.stringify(ids),
          autoenhanceImageId: null,
          status: "processing",
          errorMessage: null,
        },
      }),
    ),
  );

  // Trigger visual auto-grouping + processing.
  try {
    await triggerAutoenhanceProcess(orderId);
  } catch (err: unknown) {
    log.error("enhance-batch.trigger_process_failed", {
      jobId,
      orderId,
      err: err instanceof Error ? err.message : String(err),
    });
    // Leave orderId in place so the client can poll and see the error.
    return NextResponse.json(
      {
        error:
          "Brackets uploaded but Autoenhance refused to start processing: " +
          (err instanceof Error ? err.message : "unknown"),
      },
      { status: 502 },
    );
  }

  log.info("enhance-batch.processing", {
    jobId,
    orderId,
    photoCount: bracketIdByPhoto.size,
    uploaded: tasks.length - failures.length,
    failed: failures.length,
  });

  return NextResponse.json({
    orderId,
    photoCount: bracketIdByPhoto.size,
    filesUploaded: tasks.length - failures.length,
    filesFailed: failures.length,
  });
}
