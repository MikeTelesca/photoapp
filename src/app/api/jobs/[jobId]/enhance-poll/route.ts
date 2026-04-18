import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { log } from "@/lib/logger";
import {
  persistEnhancedEdit,
  sanitizeFolderName,
  slugifyForFilename,
} from "@/lib/dropbox";
import { getOrderStatus, downloadAutoenhanceImage } from "@/lib/autoenhance";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// POST /api/jobs/:jobId/enhance-poll
//
// Client polls this every ~10s after firing /enhance-batch. Server checks
// Autoenhance order status, downloads any newly-completed images, uploads
// them to Dropbox, updates Photo rows.
//
// Response:
//   { status: "idle" | "merging" | "processing" | "downloading" | "done",
//     progress: { total, ready, failed } }
export async function POST(
  _request: NextRequest,
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

  if (!job.autoenhanceOrderId) {
    return NextResponse.json({ status: "idle", progress: { total: 0, ready: 0, failed: 0 } });
  }

  let status;
  try {
    status = await getOrderStatus(job.autoenhanceOrderId);
  } catch (err: unknown) {
    log.error("enhance-poll.status_failed", {
      jobId,
      orderId: job.autoenhanceOrderId,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        error: `Could not reach Autoenhance: ${
          (err instanceof Error ? err.message : String(err)).slice(0, 200)
        }`,
      },
      { status: 502 },
    );
  }

  // Load all Photo rows in this job that participated in the order (i.e.
  // have bracketIds stored). We'll use their bracket_ids to map Autoenhance
  // images back to our Photos.
  const photosInOrder = await prisma.photo.findMany({
    where: { jobId, autoenhanceBracketIds: { not: null } },
    orderBy: { orderIndex: "asc" },
  });

  // Precompute bracket_id → photoId lookups for reconciliation.
  const bracketToPhoto = new Map<string, string>();
  for (const p of photosInOrder) {
    try {
      const ids = JSON.parse(p.autoenhanceBracketIds ?? "[]") as string[];
      for (const bid of ids) bracketToPhoto.set(bid, p.id);
    } catch {
      /* ignore malformed */
    }
  }

  // Folder path resolution (same as enhance-batch)
  const destFolderPath = job.agent?.dropboxFolder
    ? `${job.agent.dropboxFolder}/${sanitizeFolderName(job.address)}`
    : `/BatchBase/_uploads/${job.id}`;
  const addressSlug = slugifyForFilename(job.address);

  // Precompute fileName → photoId fallback lookup (Autoenhance's image_name
  // typically mirrors the first bracket filename we uploaded).
  const fileNameToPhoto = new Map<string, string>();
  for (const p of photosInOrder) {
    try {
      const exif = p.exifData ? JSON.parse(p.exifData) : null;
      const files = exif?.photos;
      if (Array.isArray(files)) {
        for (const f of files) {
          if (f?.fileName && typeof f.fileName === "string") {
            fileNameToPhoto.set(f.fileName.toLowerCase(), p.id);
            // Strip extension too — Autoenhance sometimes renames/drops suffixes
            const stem = f.fileName.toLowerCase().replace(/\.[^.]+$/, "");
            fileNameToPhoto.set(stem, p.id);
          }
        }
      }
    } catch {
      /* skip malformed */
    }
  }

  // Process all ready Autoenhance images in this poll cycle.
  let downloadedThisPoll = 0;
  let failedThisPoll = 0;
  let firstUnmatched = true;

  for (const image of status.images ?? []) {
    if (!image.image_id) continue;

    // Find the Photo(s) this output maps to. Try bracket_ids first, then
    // fall back to image_name → fileName. Autoenhance's bracket_ids field
    // sometimes isn't populated in the images array even though the order
    // returns them at registration time.
    const matchedPhotoIds = new Set<string>();
    for (const bid of image.bracket_ids ?? []) {
      const pid = bracketToPhoto.get(bid);
      if (pid) matchedPhotoIds.add(pid);
    }
    // Filename fallback
    const rawImage = image as unknown as Record<string, unknown>;
    const candidateNames: string[] = [];
    for (const key of ["image_name", "name", "source_name", "filename"]) {
      const v = rawImage[key];
      if (typeof v === "string" && v) candidateNames.push(v.toLowerCase());
    }
    if (matchedPhotoIds.size === 0) {
      for (const name of candidateNames) {
        const stem = name.replace(/\.[^.]+$/, "");
        const pid = fileNameToPhoto.get(name) ?? fileNameToPhoto.get(stem);
        if (pid) {
          matchedPhotoIds.add(pid);
          break;
        }
      }
    }
    if (matchedPhotoIds.size === 0) {
      // Log the ENTIRE image object the first time so we can see what
      // Autoenhance's actual response shape looks like and fix the mapping.
      if (firstUnmatched) {
        log.warn("enhance-poll.no_photo_match.shape", {
          jobId,
          orderId: job.autoenhanceOrderId,
          imageId: image.image_id,
          imageKeys: Object.keys(rawImage),
          imageSample: JSON.stringify(image).slice(0, 1500),
        });
        firstUnmatched = false;
      } else {
        log.warn("enhance-poll.no_photo_match", {
          jobId,
          orderId: job.autoenhanceOrderId,
          imageId: image.image_id,
        });
      }
      continue;
    }

    const matchedPhotos = photosInOrder.filter((p) => matchedPhotoIds.has(p.id));
    matchedPhotos.sort((a, b) => a.orderIndex - b.orderIndex);
    const winner = matchedPhotos[0];
    const extras = matchedPhotos.slice(1);

    // Autoenhance reported an error for this image — mark winner failed.
    if (image.error) {
      const errMsg = typeof image.error === "string" ? image.error : "Autoenhance error";
      const safe = errMsg.replace(/\x00/g, "").slice(0, 1000);
      if (winner.status !== "failed") {
        await prisma.photo.update({
          where: { id: winner.id },
          data: {
            status: "failed",
            errorMessage: safe,
            autoenhanceImageId: image.image_id,
          },
        });
        failedThisPoll += 1;
      }
      continue;
    }

    // Not ready yet.
    if (!image.enhanced) continue;

    // Already downloaded — skip.
    if (winner.autoenhanceImageId === image.image_id && winner.editedUrl) continue;

    // Download + upload to Dropbox.
    try {
      const { buffer } = await downloadAutoenhanceImage(image.image_id);
      const num = String(winner.orderIndex + 1).padStart(2, "0");
      const urls = await persistEnhancedEdit({
        imageBuffer: buffer,
        destFolderPath,
        fileBaseName: `${addressSlug}-${num}`,
      });

      // If Autoenhance merged multiple of our photos into one output, fold
      // their exifData bracket files into the winner's so future ops still
      // know about all source frames, then drop the extras.
      let mergedExif: string | null = winner.exifData;
      if (extras.length > 0) {
        try {
          const winnerParsed = winner.exifData ? JSON.parse(winner.exifData) : { photos: [] };
          const merged = Array.isArray(winnerParsed.photos) ? [...winnerParsed.photos] : [];
          for (const e of extras) {
            try {
              const p = e.exifData ? JSON.parse(e.exifData) : null;
              if (p?.photos && Array.isArray(p.photos)) merged.push(...p.photos);
            } catch {
              /* skip */
            }
          }
          mergedExif = JSON.stringify({ bracketCount: merged.length, photos: merged });
        } catch {
          /* keep winner.exifData */
        }
      }

      await prisma.photo.update({
        where: { id: winner.id },
        data: {
          status: "edited",
          editedUrl: urls.editedUrl,
          thumbnailUrl: urls.thumbnailUrl,
          autoenhanceImageId: image.image_id,
          exifData: mergedExif,
          bracketIndex:
            mergedExif
              ? (() => {
                  try {
                    const p = JSON.parse(mergedExif);
                    return typeof p.bracketCount === "number"
                      ? p.bracketCount
                      : winner.bracketIndex;
                  } catch {
                    return winner.bracketIndex;
                  }
                })()
              : winner.bracketIndex,
          errorMessage: null,
        },
      });

      if (extras.length > 0) {
        await prisma.photo.deleteMany({
          where: { id: { in: extras.map((e) => e.id) } },
        });
        log.info("enhance-poll.reconciled", {
          jobId,
          imageId: image.image_id,
          winner: winner.id,
          mergedCount: extras.length,
        });
      }

      downloadedThisPoll += 1;
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : String(err))
        .replace(/\x00/g, "")
        .slice(0, 1000);
      log.error("enhance-poll.download_failed", {
        jobId,
        orderId: job.autoenhanceOrderId,
        imageId: image.image_id,
        err: msg,
      });
      await prisma.photo.update({
        where: { id: winner.id },
        data: { status: "failed", errorMessage: msg },
      });
      failedThisPoll += 1;
    }
  }

  // If everything is done on Autoenhance's side, finalise: clear order on
  // the Job so new batches can start.
  const allDone =
    status.is_merging === false &&
    status.is_processing === false &&
    (status.images ?? []).every((i) => i.enhanced === true || !!i.error);

  if (allDone) {
    const remainingProcessing = await prisma.photo.count({
      where: { jobId, status: "processing" },
    });
    const total = await prisma.photo.count({ where: { jobId } });
    const readyCount = await prisma.photo.count({ where: { jobId, status: "edited" } });
    const failedCount = await prisma.photo.count({ where: { jobId, status: "failed" } });

    // Safety: if Autoenhance says "done" but we couldn't match ANY images
    // to our Photo rows on this tick, and there are still processing photos,
    // don't mark them failed or clear the order — leave it so the client
    // can retry polling after a code fix, or so the user can investigate.
    const hasImages = (status.images ?? []).length > 0;
    const matchingTotallyBroken = hasImages && downloadedThisPoll === 0 && remainingProcessing > 0;
    if (matchingTotallyBroken) {
      log.error("enhance-poll.matching_broken", {
        jobId,
        orderId: job.autoenhanceOrderId,
        autoenhanceImageCount: (status.images ?? []).length,
        ourPhotoInOrderCount: photosInOrder.length,
        remainingProcessing,
      });
      return NextResponse.json({
        status: "processing",
        progress: {
          total: photosInOrder.length,
          ready: readyCount,
          failed: errorCountFromImages(status.images),
        },
        note: "Autoenhance finished but we couldn't match any outputs to photos. Order preserved for retry.",
      });
    }

    // Normal completion: mark any genuinely orphaned processing photos as
    // failed (e.g. Autoenhance dropped them silently) and clear the order.
    if (remainingProcessing > 0) {
      await prisma.photo.updateMany({
        where: { jobId, status: "processing" },
        data: {
          status: "failed",
          errorMessage: "Autoenhance did not return an output for this photo",
        },
      });
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        autoenhanceOrderId: null,
        enhanceStartedAt: null,
        status: readyCount > 0 ? "review" : "pending",
      },
    });

    log.info("enhance-poll.done", {
      jobId,
      total,
      ready: readyCount,
      failed: failedCount,
    });

    return NextResponse.json({
      status: "done",
      progress: { total, ready: readyCount, failed: failedCount },
      downloadedThisPoll,
      failedThisPoll,
    });
  }

  // Still in flight — report progress.
  const readyCount = (status.images ?? []).filter((i) => i.enhanced && !i.error).length;
  const errorCount = errorCountFromImages(status.images);

  const phase = status.is_merging ? "merging" : status.is_processing ? "processing" : "downloading";

  return NextResponse.json({
    status: phase,
    progress: {
      total: photosInOrder.length,
      ready: readyCount,
      failed: errorCount,
    },
    downloadedThisPoll,
    failedThisPoll,
  });
}

function errorCountFromImages(images?: Array<{ error?: string | boolean | null }>): number {
  return (images ?? []).filter((i) => !!i.error).length;
}
