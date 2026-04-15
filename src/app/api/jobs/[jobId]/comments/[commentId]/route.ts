import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

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
