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

  // Parse recipients - accept either a single string or an array of strings
  const recipients: string[] = Array.isArray(to)
    ? to.map(s => String(s).trim()).filter(s => s.includes("@"))
    : [String(to || "").trim()].filter(s => s.includes("@"));

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Valid email(s) required" }, { status: 400 });
  }
  if (recipients.length > 20) {
    return NextResponse.json({ error: "Max 20 recipients per send" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { client: true } as any,
  });
  if (!job || !job.shareToken || !job.shareEnabled) {
    return NextResponse.json({ error: "Share link not enabled for this job" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: (job as any).photographerId },
    select: { name: true, email: true, emailSignature: true },
  });
  const photographerName = user?.name || user?.email || "ATH Media";

  const baseUrl = process.env.NEXTAUTH_URL || "https://ath-editor.vercel.app";
  const shareUrl = `${baseUrl}/share/${job.shareToken}`;

  const approvedCount = await prisma.photo.count({
    where: { jobId, status: "approved" },
  });

  // Send to each recipient and track successes
  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    // Create log entry first to get the ID for tracking pixel
    const log = await prisma.shareEmailLog.create({
      data: {
        jobId,
        toEmail: recipient,
        sentBy: access.userId,
      },
    }).catch(() => null);

    const trackingPixelUrl = log ? `${baseUrl}/api/track/email-open/${log.id}` : undefined;

    const ok = await sendEmail({
      to: recipient,
      subject: `Photos ready: ${job.address}`,
      html: shareLinkTemplate({
        photographerName,
        address: job.address,
        photoCount: approvedCount,
        shareUrl,
        password: password?.trim() || undefined,
        personalMessage: personalMessage?.trim() || undefined,
        signature: user?.emailSignature || undefined,
        trackingPixelUrl,
      }),
    });

    if (ok) {
      sent++;
    } else {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed });
}
