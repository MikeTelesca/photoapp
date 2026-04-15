import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export const maxDuration = 300;

export async function POST(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  // Caption all approved photos that don't yet have a caption
  const photos = await prisma.photo.findMany({
    where: { jobId, status: "approved", caption: null },
    select: { id: true, editedUrl: true, originalUrl: true },
    take: 50,
  });

  // Trigger captions one at a time (sequential to respect rate limits)
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  let success = 0;
  let failed = 0;

  for (const p of photos) {
    try {
      const res = await fetch(`${baseUrl}/api/jobs/${jobId}/photos/${p.id}/caption`, {
        method: "POST",
        headers: { cookie: _request.headers.get("cookie") || "" },
      });
      if (res.ok) success++;
      else failed++;
    } catch { failed++; }
  }

  return NextResponse.json({ requested: photos.length, success, failed });
}
