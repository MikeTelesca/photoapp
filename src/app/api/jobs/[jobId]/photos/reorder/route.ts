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

  const body = await request.json();
  const order: string[] | undefined = Array.isArray(body?.order)
    ? body.order
    : Array.isArray(body?.photoIds)
      ? body.photoIds
      : undefined;

  if (!order) {
    return NextResponse.json(
      { error: "order must be an array of photo IDs" },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    order.map((id: string, idx: number) =>
      prisma.photo.update({
        where: { id, jobId },
        data: { orderIndex: idx },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
