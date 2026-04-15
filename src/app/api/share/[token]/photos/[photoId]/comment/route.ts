import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notify, shouldNotify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; photoId: string }> }
) {
  const { token, photoId } = await params;

  // Verify token + photo ownership
  const job = await prisma.job.findFirst({
    where: { shareToken: token, shareEnabled: true },
  });
  if (!job) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  const photo = await prisma.photo.findFirst({ where: { id: photoId, jobId: job.id } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { authorName, message } = await request.json();
  if (!authorName || !message) {
    return NextResponse.json({ error: "Name and message required" }, { status: 400 });
  }
  if (message.length > 1000 || authorName.length > 100) {
    return NextResponse.json({ error: "Too long" }, { status: 400 });
  }

  try {
    const comment = await prisma.photoComment.create({
      data: { photoId, authorName: authorName.trim(), message: message.trim() },
    });

    // Check per-event notification preference
    const allowed = await shouldNotify(job.photographerId, "client-comment");
    if (allowed) {
      // In-app notification to the photographer
      await notify({
        userId: job.photographerId,
        type: "client-comment",
        title: `Client comment on ${job.address}`,
        body: `${authorName}: ${message.slice(0, 100)}`,
        href: `/review/${job.id}`,
      }).catch(() => {});

      // Email notification to the photographer (non-blocking, fail silently)
      try {
        const user = await prisma.user.findUnique({
          where: { id: job.photographerId },
          select: { email: true, emailNotifications: true, emailSignature: true },
        });
        if (user?.email && user.emailNotifications) {
          const baseUrl = process.env.NEXTAUTH_URL || "https://ath-editor.vercel.app";
          const viewUrl = `${baseUrl}/review/${job.id}`;
          const escHtml = (s: string) =>
            s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
          const safeName = escHtml(authorName.trim());
          const safeMessage = escHtml(message.trim()).replace(/\n/g, "<br>");
          const safeAddress = escHtml(job.address);
          const html = `
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <h1 style="color: #111; font-size: 22px;">New comment on ${safeAddress}</h1>
              <p style="color: #555; font-size: 14px; margin-top: 8px;">
                <strong>${safeName}</strong> left a comment on a photo:
              </p>
              <div style="background: #f0fdfa; border-left: 4px solid #06b6d4; padding: 14px 18px; margin: 16px 0; color: #333; font-size: 14px; line-height: 1.5;">
                ${safeMessage}
              </div>
              <a href="${viewUrl}" style="display: inline-block; margin-top: 12px; padding: 12px 24px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">View in app</a>
              ${user.emailSignature ? `
                <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color: #555; font-size: 13px; white-space: pre-wrap;">
                  ${escHtml(user.emailSignature)}
                </div>
              ` : `<p style="color: #999; font-size: 12px; margin-top: 40px;">ATH Media · AI Photo Editor</p>`}
            </div>
          `;
          await sendEmail({
            to: user.email,
            subject: `New comment on ${job.address}`,
            html,
          });
        }
      } catch (emailErr) {
        console.error("[email] client-comment notification failed (non-fatal):", emailErr);
      }
    }

    return NextResponse.json(comment);
  } catch (err) {
    console.error("PhotoComment.create failed (migration may be pending):", err);
    return NextResponse.json({ error: "Could not save comment" }, { status: 500 });
  }
}
