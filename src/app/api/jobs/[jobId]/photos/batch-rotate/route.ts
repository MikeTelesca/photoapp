import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { uploadToDropbox } from "@/lib/dropbox";

export const runtime = "nodejs";
export const maxDuration = 300;

type RotateDegrees = 90 | -90 | 180;

/**
 * POST /api/jobs/:jobId/photos/batch-rotate
 * Body: { photoIds: string[], degrees: 90 | -90 | 180 }
 *
 * Streams NDJSON progress events so the client can display a progress toast:
 *   { type: "progress", done, total, photoId, ok }
 *   { type: "done", rotated, failed }
 *
 * Photos are processed sequentially to avoid Dropbox rate limits.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => ({}));
  const photoIds: string[] = Array.isArray(body.photoIds) ? body.photoIds : [];
  const degreesRaw = body.degrees;
  const degrees: RotateDegrees = [90, -90, 180].includes(degreesRaw)
    ? (degreesRaw as RotateDegrees)
    : 90;

  if (photoIds.length === 0) {
    return new Response(JSON.stringify({ error: "No photoIds provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, jobId },
  });

  const sharp = (await import("sharp")).default;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };

      const total = photos.length;
      let rotated = 0;
      let failed = 0;
      let done = 0;

      send({ type: "start", total });

      // Sequential to avoid Dropbox rate limits
      for (const photo of photos) {
        const url = photo.editedUrl || photo.originalUrl;
        let ok = false;
        if (url) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              const buf = Buffer.from(await res.arrayBuffer());
              const out = await sharp(buf)
                .rotate(degrees)
                .jpeg({ quality: 92, mozjpeg: true })
                .toBuffer();
              const path = `/ath-editor-edits/${jobId}/${photo.id}-rotated-${Date.now()}.jpg`;
              const newUrl = await uploadToDropbox(out, path);
              await prisma.photo.update({
                where: { id: photo.id },
                data: { editedUrl: newUrl },
              });
              ok = true;
            }
          } catch (err) {
            console.error("batch-rotate err:", err);
          }
        }
        done++;
        if (ok) rotated++;
        else failed++;
        send({ type: "progress", done, total, photoId: photo.id, ok });
      }

      send({ type: "done", rotated, failed });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
