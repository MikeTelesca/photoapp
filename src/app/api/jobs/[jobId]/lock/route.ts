import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const access = await requireJobAccess(jobId);
    if ("error" in access) return access.error;

    await prisma.job.update({
      where: { id: jobId },
      data: { lockedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to lock job:", error);
    return NextResponse.json(
      { error: "Failed to lock job" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const access = await requireJobAccess(jobId);
    if ("error" in access) return access.error;

    await prisma.job.update({
      where: { id: jobId },
      data: { lockedAt: null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to unlock job:", error);
    return NextResponse.json(
      { error: "Failed to unlock job" },
      { status: 500 }
    );
  }
}
