import { requireJobAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const authResult = await requireJobAccess(jobId);
  if ("error" in authResult) return authResult.error;

  const token = crypto.randomBytes(16).toString("hex");
  const job = await prisma.job.update({
    where: { id: jobId },
    data: { shareToken: token, shareEnabled: true },
  });

  return NextResponse.json({ token: job.shareToken, enabled: job.shareEnabled });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const authResult = await requireJobAccess(jobId);
  if ("error" in authResult) return authResult.error;

  await prisma.job.update({
    where: { id: jobId },
    data: { shareEnabled: false },
  });

  return NextResponse.json({ enabled: false });
}
