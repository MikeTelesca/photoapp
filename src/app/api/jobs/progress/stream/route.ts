import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = auth.userId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let active = true;

      // Helper to send an SSE event
      const send = (data: any) => {
        if (!active) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          active = false;
        }
      };

      // Send initial state
      try {
        const jobs = await prisma.job.findMany({
          where: {
            photographerId: userId,
            status: "processing",
            archivedAt: null,
          },
          select: {
            id: true,
            address: true,
            totalPhotos: true,
            processedPhotos: true,
            approvedPhotos: true,
            rejectedPhotos: true,
            status: true,
          },
        });
        send({ type: "init", jobs });
      } catch (err) {
        console.error("init err:", err);
      }

      // Poll DB every 4 seconds and send updates if changed
      let lastSnapshot = "";
      const interval = setInterval(async () => {
        if (!active) {
          clearInterval(interval);
          return;
        }
        try {
          const jobs = await prisma.job.findMany({
            where: {
              photographerId: userId,
              status: { in: ["processing", "review"] },
              archivedAt: null,
            },
            select: {
              id: true,
              address: true,
              totalPhotos: true,
              processedPhotos: true,
              approvedPhotos: true,
              rejectedPhotos: true,
              status: true,
            },
          });
          const snapshot = JSON.stringify(jobs);
          if (snapshot !== lastSnapshot) {
            lastSnapshot = snapshot;
            send({ type: "update", jobs });
          } else {
            // Heartbeat to keep connection alive
            send({ type: "heartbeat", at: Date.now() });
          }
        } catch (err) {
          console.error("poll err:", err);
        }
      }, 4000);

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        active = false;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
