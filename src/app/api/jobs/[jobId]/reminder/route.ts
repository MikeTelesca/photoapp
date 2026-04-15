import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const { at, note } = await request.json();
  let reminderAt: Date | null = null;
  if (at) {
    const d = new Date(at);
    if (!isNaN(d.getTime())) reminderAt = d;
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      reminderAt,
      reminderNote: note?.trim() || null,
      reminderSent: false, // reset
    },
  });

  return NextResponse.json({ ok: true });
}
