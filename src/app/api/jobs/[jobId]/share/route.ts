import { requireJobAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const authResult = await requireJobAccess(jobId);
  if ("error" in authResult) return authResult.error;

  const body = await req.json().catch(() => ({}));
  const password = body?.password;
  const expiresAt = body?.expiresAt;

  let hash: string | null = null;
  if (password && typeof password === "string" && password.length > 0) {
    hash = await bcrypt.hash(password, 10);
  }

  let expiry: Date | null = null;
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (!isNaN(d.getTime())) expiry = d;
  }

  const token = crypto.randomBytes(16).toString("hex");
  const job = await prisma.job.update({
    where: { id: jobId },
    data: {
      shareToken: token,
      shareEnabled: true,
      sharePassword: hash,
      shareExpiresAt: expiry,
    },
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
