import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const result = await prisma.photo.updateMany({
    where: { jobId, status: { in: ["pending", "edited"] } },
    data: { status: "rejected" },
  });

  await prisma.job.update({
    where: { id: jobId },
    data: { rejectedPhotos: { increment: result.count } },
  });

  return NextResponse.json({ rejected: result.count });
}
