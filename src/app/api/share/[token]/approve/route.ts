import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { notify } from "@/lib/notify";
import { sendSlackNotification } from "@/lib/slack";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const job = await prisma.job.findFirst({
    where: { shareToken: token, shareEnabled: true },
    include: { photographer: { select: { id: true, email: true, name: true } } },
  });
  if (!job) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  let body: { action?: string; note?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { action, note } = body;
  if (action !== "approve" && action !== "request_changes") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const status = action === "approve" ? "approved" : "changes_requested";
  const trimmedNote = note ? String(note).trim().slice(0, 2000) : null;

  await prisma.job.update({
    where: { id: job.id },
    data: {
      clientApprovalStatus: status,
      clientApprovedAt: new Date(),
      clientApprovalNote: trimmedNote,
    },
  });

  // Send notification to photographer
  const actionLabel = action === "approve" ? "approved" : "requested changes for";
  const subject = `Client ${action === "approve" ? "approved" : "requested changes"} for ${job.address}`;
  const photographerEmail = job.photographer?.email;

  if (photographerEmail) {
    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
        <h2 style="color: #111; font-size: 22px; margin-bottom: 8px;">
          Your client ${actionLabel} ${escapeHtml(job.address)}
        </h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          Status: <strong>${status === "approved" ? "Approved ✅" : "Changes Requested 📝"}</strong>
        </p>
        ${trimmedNote ? `<div style="border-left: 4px solid #06b6d4; padding: 10px 14px; margin: 16px 0; background: #f8fafc; color: #333; font-size: 14px; white-space: pre-wrap;">${escapeHtml(trimmedNote)}</div>` : ""}
        <p style="color: #888; font-size: 13px; margin-top: 24px;">
          Review the job: <a href="${process.env.NEXT_PUBLIC_APP_URL || ""}/review/${job.id}" style="color: #06b6d4;">Open in ATH Media</a>
        </p>
      </div>
    `;
    await sendEmail({ to: photographerEmail, subject, html }).catch(() => {});
  }

  // In-app notification
  await notify({
    userId: job.photographerId,
    type: "client-comment",
    title: subject,
    body: trimmedNote ? trimmedNote.slice(0, 200) : undefined,
    href: `/review/${job.id}`,
  }).catch(() => {});

  // Slack/Discord webhook notification
  const clientLabel = job.clientName || "Client";
  const slackMessage =
    action === "approve"
      ? `✅ ${clientLabel} approved ${job.address}`
      : `📝 ${clientLabel} requested changes on ${job.address}${trimmedNote ? `\n> ${trimmedNote.slice(0, 500)}` : ""}`;
  await sendSlackNotification(job.photographerId, slackMessage);

  return NextResponse.json({ ok: true, status });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
