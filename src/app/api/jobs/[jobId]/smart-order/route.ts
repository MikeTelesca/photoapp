import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { smartSort } from "@/lib/mls-order";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const photos = await prisma.photo.findMany({
    where: { jobId },
    select: { id: true, autoTags: true, orderIndex: true, createdAt: true },
  });

  const sorted = smartSort(photos);

  // Apply new orderIndex
  await prisma.$transaction(
    sorted.map((p, idx) =>
      prisma.photo.update({
        where: { id: p.id },
        data: { orderIndex: idx },
      })
    )
  );

  return NextResponse.json({ ok: true, count: sorted.length });
}
