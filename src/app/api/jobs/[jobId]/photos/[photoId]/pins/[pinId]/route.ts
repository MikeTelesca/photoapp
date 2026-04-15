import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string; pinId: string }> }
) {
  const { jobId, pinId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  await prisma.photoPin.delete({ where: { id: pinId } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
