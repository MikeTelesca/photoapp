import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const rateErr = checkRate(access.userId, "enhance");
  if (rateErr) return rateErr;

  const body = await request.json();
  const { filter, preset, ids } = body;
  // filter: "rejected" | "all" | "selected"
  // preset: optional string to switch preset first
  // ids: optional array of photo ids (used when filter === "selected")

  const where: Record<string, unknown> = { jobId };
  if (filter === "rejected") {
    where.status = "rejected";
  } else if (filter === "selected" && Array.isArray(ids)) {
    where.id = { in: ids };
  }

  // If preset specified, update job preset first
  if (preset) {
    await prisma.job.update({ where: { id: jobId }, data: { preset } });
  }

  // Mark matching photos as pending so the existing enhance loop picks them up
  const updated = await prisma.photo.updateMany({
    where,
    data: { status: "pending", rejectionReason: null },
  });

  // Set job to processing
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "processing" },
  });

  // Kick off the start-enhance loop — fire-and-forget (client will poll)
  const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:3000`;
  fetch(`${baseUrl}/api/jobs/${jobId}/start-enhance`, {
    method: "POST",
    headers: { cookie: request.headers.get("cookie") || "" },
  }).catch((err) => console.error("[batch-enhance] kickoff error:", err));

  return NextResponse.json({ reset: updated.count, preset: preset || null });
}
