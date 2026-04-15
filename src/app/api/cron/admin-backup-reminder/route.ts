import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { notify } from "@/lib/notify";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admins = await prisma.user.findMany({
    where: { role: "admin" },
  }).catch(() => []);

  // Get app stats
  const [totalJobs, totalUsers, totalPhotos] = await Promise.all([
    prisma.job.count().catch(() => 0),
    prisma.user.count().catch(() => 0),
    prisma.photo.count().catch(() => 0),
  ]);

  const baseUrl = process.env.NEXTAUTH_URL || "https://ath-editor.vercel.app";

  let sent = 0;
  for (const admin of admins) {
    if (!admin.email) continue;

    // In-app notification
    await notify({
      userId: admin.id,
      type: "digest",
      title: "📦 Weekly admin reminder: verify backups",
      body: `${totalUsers} users · ${totalJobs} jobs · ${totalPhotos} photos`,
      href: "/admin/health",
    }).catch(() => {});

    // Email
    if (admin.weeklyDigest !== false) {
      const ok = await sendEmail({
        to: admin.email,
        subject: "Weekly admin status & backup reminder",
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
            <h1 style="color: #111; font-size: 22px;">Weekly admin reminder</h1>
            <p style="color: #555; font-size: 14px; line-height: 1.5;">
              This is your weekly reminder to verify Neon database backups are healthy.
            </p>
            <h2 style="color: #111; font-size: 16px; margin-top: 24px;">Current data</h2>
            <ul style="color: #444; font-size: 14px;">
              <li><strong>${totalUsers}</strong> users</li>
              <li><strong>${totalJobs}</strong> jobs</li>
              <li><strong>${totalPhotos}</strong> photos</li>
            </ul>
            <h2 style="color: #111; font-size: 16px; margin-top: 24px;">Backup checklist</h2>
            <ul style="color: #444; font-size: 14px; line-height: 1.7;">
              <li>Verify Neon point-in-time recovery is enabled</li>
              <li>Check Dropbox storage quota</li>
              <li>Review error log: <a href="${baseUrl}/admin/errors" style="color: #06b6d4;">${baseUrl}/admin/errors</a></li>
              <li>Review system health: <a href="${baseUrl}/admin/health" style="color: #06b6d4;">${baseUrl}/admin/health</a></li>
            </ul>
            <p style="color: #999; font-size: 12px; margin-top: 32px;">
              You're receiving this as an admin. Toggle in Settings if you'd prefer not to.
            </p>
          </div>
        `,
      });
      if (ok) sent++;
    }
  }

  return NextResponse.json({ adminsChecked: admins.length, emailsSent: sent });
}
