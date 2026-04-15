import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// POST /api/jobs/:jobId/watch — subscribe current user to job status changes.
// Allowed for admins (watching other users' jobs) or the job owner.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;
  const { userId, role } = authResult;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, photographerId: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (role !== "admin" && job.photographerId !== userId) {
    // 404 to prevent ID enumeration
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.jobWatch.upsert({
      where: { userId_jobId: { userId, jobId } },
      create: { userId, jobId },
      update: {},
    });
  } catch (err) {
    console.error("[job-watch] create failed:", err);
    return NextResponse.json({ error: "Failed to watch job" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, watching: true });
}

// DELETE /api/jobs/:jobId/watch — unsubscribe current user.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;
  const { userId, role } = authResult;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, photographerId: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (role !== "admin" && job.photographerId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.jobWatch.deleteMany({ where: { userId, jobId } });
  return NextResponse.json({ ok: true, watching: false });
}
