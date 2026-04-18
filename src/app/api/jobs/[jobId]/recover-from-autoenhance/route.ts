import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { log } from "@/lib/logger";
import {
  persistEnhancedEdit,
  sanitizeFolderName,
  slugifyForFilename,
} from "@/lib/dropbox";
import { listOrders, downloadAutoenhanceImage } from "@/lib/autoenhance";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// POST /api/jobs/:jobId/recover-from-autoenhance
//
// When a previous enhance ran successfully on Autoenhance but my poll
// failed to match outputs back to Photo rows (and marked them "failed"
// by mistake), this endpoint pulls the outputs from the existing
// Autoenhance order(s) and distributes them to the matching photos
// WITHOUT burning new credits.
//
// Matching strategy: image.image_name → exifData.photos[].fileName.
// If no orderId is provided in the body we auto-find the most recent
// Autoenhance order whose images share filenames with this job.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const body = (await request.json().catch(() => ({}))) as { orderId?: string };

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { agent: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const photos = await prisma.photo.findMany({
    where: { jobId },
    orderBy: { orderIndex: "asc" },
  });
  if (photos.length === 0) {
    return NextResponse.json({ error: "Job has no photos to recover" }, { status: 400 });
  }

  // Build filename → photoId lookup from exifData so we can match
  // Autoenhance's image.image_name back to our Photo rows.
  const fileNameToPhoto = new Map<string, string>();
  for (const p of photos) {
    try {
      const exif = p.exifData ? JSON.parse(p.exifData) : null;
      const files = exif?.photos;
      if (Array.isArray(files)) {
        for (const f of files) {
          if (typeof f?.fileName === "string" && f.fileName) {
            const lower = f.fileName.toLowerCase();
            fileNameToPhoto.set(lower, p.id);
            // Also index by stem so DJI_0556 matches DJI_0556.DNG
            fileNameToPhoto.set(lower.replace(/\.[^.]+$/, ""), p.id);
          }
        }
      }
    } catch {
      /* skip malformed exif */
    }
  }

  // Fetch Autoenhance orders and pick either the one specified or the best
  // filename match.
  let orders;
  try {
    orders = await listOrders();
  } catch (err: unknown) {
    log.error("recover.list_orders_failed", {
      jobId,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: `Could not list Autoenhance orders: ${(err instanceof Error ? err.message : String(err)).slice(0, 200)}` },
      { status: 502 },
    );
  }

  type Order = (typeof orders)[number];
  let pickedOrder: Order | null = null;
  if (body.orderId) {
    pickedOrder = orders.find((o) => o.order_id === body.orderId) ?? null;
    if (!pickedOrder) {
      return NextResponse.json(
        { error: `Order ${body.orderId} not found on your Autoenhance account` },
        { status: 404 },
      );
    }
  } else {
    // Score each order by how many of its image_names hit our filename set,
    // prefer higher match count, break ties by newest created_at.
    let bestScore = 0;
    for (const o of orders) {
      let score = 0;
      for (const img of o.images ?? []) {
        const name = (img as { image_name?: string }).image_name;
        if (!name) continue;
        const lower = name.toLowerCase();
        if (fileNameToPhoto.has(lower) || fileNameToPhoto.has(lower.replace(/\.[^.]+$/, ""))) {
          score += 1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        pickedOrder = o;
      }
    }
    if (!pickedOrder || bestScore === 0) {
      return NextResponse.json(
        {
          error:
            "Couldn't find a matching Autoenhance order. The filenames in your job don't overlap with any of your recent Autoenhance orders.",
        },
        { status: 404 },
      );
    }
  }

  log.info("recover.order_picked", {
    jobId,
    orderId: pickedOrder.order_id,
    imageCount: (pickedOrder.images ?? []).length,
  });

  const destFolderPath = job.agent?.dropboxFolder
    ? `${job.agent.dropboxFolder}/${sanitizeFolderName(job.address)}`
    : `/BatchBase/_uploads/${job.id}`;
  const addressSlug = slugifyForFilename(job.address);

  let matched = 0;
  let downloaded = 0;
  let failed = 0;
  const errors: Array<{ imageId: string; reason: string }> = [];

  for (const rawImage of pickedOrder.images ?? []) {
    const image = rawImage as {
      image_id?: string;
      image_name?: string;
      enhanced?: boolean;
      error?: string | boolean | null;
    };
    if (!image.image_id || !image.enhanced || image.error) continue;

    const name = (image.image_name ?? "").toLowerCase();
    if (!name) continue;
    const photoId =
      fileNameToPhoto.get(name) ?? fileNameToPhoto.get(name.replace(/\.[^.]+$/, ""));
    if (!photoId) continue;
    matched += 1;

    const photo = photos.find((p) => p.id === photoId);
    if (!photo) continue;

    // Skip if already processed (recovery is idempotent).
    if (photo.autoenhanceImageId === image.image_id && photo.editedUrl) {
      downloaded += 1;
      continue;
    }

    try {
      const { buffer } = await downloadAutoenhanceImage(image.image_id);
      const num = String(photo.orderIndex + 1).padStart(2, "0");
      const urls = await persistEnhancedEdit({
        imageBuffer: buffer,
        destFolderPath,
        fileBaseName: `${addressSlug}-${num}`,
      });
      await prisma.photo.update({
        where: { id: photoId },
        data: {
          status: "edited",
          editedUrl: urls.editedUrl,
          thumbnailUrl: urls.thumbnailUrl,
          autoenhanceImageId: image.image_id,
          errorMessage: null,
        },
      });
      downloaded += 1;
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : String(err))
        .replace(/\x00/g, "")
        .slice(0, 500);
      log.error("recover.download_failed", {
        jobId,
        orderId: pickedOrder.order_id,
        imageId: image.image_id,
        err: msg,
      });
      errors.push({ imageId: image.image_id, reason: msg });
      failed += 1;
    }
  }

  // If the job had previously flipped to "pending" because the buggy
  // all-done branch cleared it, promote to "review" so the UI reflects
  // the recovered state.
  if (downloaded > 0) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "review" },
    });
  }

  log.info("recover.done", {
    jobId,
    orderId: pickedOrder.order_id,
    matched,
    downloaded,
    failed,
  });

  return NextResponse.json({
    orderId: pickedOrder.order_id,
    matched,
    downloaded,
    failed,
    errors: errors.slice(0, 10),
  });
}
