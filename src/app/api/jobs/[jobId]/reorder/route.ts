import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const { photoIds } = await request.json();
  if (!Array.isArray(photoIds)) {
    return NextResponse.json({ error: "photoIds must be array" }, { status: 400 });
  }

  await prisma.$transaction(
    photoIds.map((id: string, idx: number) =>
      prisma.photo.update({
        where: { id, jobId },
        data: { orderIndex: idx },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
