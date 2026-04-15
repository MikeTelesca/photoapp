import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const { seconds } = await request.json();
  const add = Math.max(0, Math.floor(Number(seconds) || 0));
  if (add === 0) return NextResponse.json({ ok: true });

  await prisma.job.update({
    where: { id: jobId },
    data: { trackedTimeSeconds: { increment: add } },
  });

  return NextResponse.json({ ok: true });
}
