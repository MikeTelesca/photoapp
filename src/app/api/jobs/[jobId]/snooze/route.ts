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

  const { until } = await request.json();
  let snoozedUntil: Date | null = null;
  if (until) {
    const d = new Date(until);
    if (!isNaN(d.getTime())) snoozedUntil = d;
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { snoozedUntil },
  });

  return NextResponse.json({ ok: true });
}
