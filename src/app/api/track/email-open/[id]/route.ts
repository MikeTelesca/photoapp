import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 1x1 transparent GIF
const GIF_BUFFER = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Mark opened (fire-and-forget)
  prisma.shareEmailLog.update({
    where: { id },
    data: {
      openedAt: new Date(),
      openCount: { increment: 1 },
    },
  }).catch(err => {
    console.error("[track-open] err:", err);
  });

  return new NextResponse(new Uint8Array(GIF_BUFFER), {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
