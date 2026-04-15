import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ jobId: string; photoId: string }> }) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const versions = await prisma.photoVersion.findMany({
    where: { photoId },
    orderBy: { createdAt: "desc" },
    take: 20,
  }).catch(() => []);

  return NextResponse.json({ versions });
}
