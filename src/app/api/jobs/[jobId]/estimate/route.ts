import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

const COST_PER_PHOTO = 0.07;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: (job as any).photographerId } });
  const budgetPerJob = (user as any)?.budgetPerJob ?? 20;

  const photoCount = job.totalPhotos || 0;
  const estimatedCost = photoCount * COST_PER_PHOTO;

  return NextResponse.json({
    photoCount,
    costPerPhoto: COST_PER_PHOTO,
    estimatedCost: Math.round(estimatedCost * 100) / 100,
    budgetPerJob,
    overBudget: estimatedCost > budgetPerJob,
  });
}
