import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; commentId: string }> }
) {
  const { jobId, commentId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const { body } = await request.json();
  if (!body || !body.trim()) return NextResponse.json({ error: "body required" }, { status: 400 });

  // Only allow editing own comments
  const result = await prisma.jobComment.updateMany({
    where: { id: commentId, jobId, authorId: access.userId },
    data: { body: body.trim().slice(0, 2000) },
  });

  if (result.count === 0) return NextResponse.json({ error: "Not your comment" }, { status: 403 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string; commentId: string }> }
) {
  const { jobId, commentId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  // Only delete own comments (or admin)
  await prisma.jobComment.deleteMany({
    where: { id: commentId, jobId, authorId: access.userId },
  });

  return NextResponse.json({ ok: true });
}
