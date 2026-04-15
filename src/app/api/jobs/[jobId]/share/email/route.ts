import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { sendEmail, shareLinkTemplate } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const { to, password, personalMessage } = await request.json();
  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { client: true } as any,
  });
  if (!job || !job.shareToken || !job.shareEnabled) {
    return NextResponse.json({ error: "Share link not enabled for this job" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: (job as any).photographerId } });
  const photographerName = user?.name || user?.email || "ATH Media";

  const baseUrl = process.env.NEXTAUTH_URL || "https://ath-editor.vercel.app";
  const shareUrl = `${baseUrl}/share/${job.shareToken}`;

  const approvedCount = await prisma.photo.count({
    where: { jobId, status: "approved" },
  });

  const ok = await sendEmail({
    to,
    subject: `Photos ready: ${job.address}`,
    html: shareLinkTemplate({
      photographerName,
      address: job.address,
      photoCount: approvedCount,
      shareUrl,
      password: password?.trim() || undefined,
      personalMessage: personalMessage?.trim() || undefined,
    }),
  });

  return NextResponse.json({ ok });
}
