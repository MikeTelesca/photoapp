import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, weeklyDigestTemplate } from "@/lib/email";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const weekEnd = new Date();
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: { weeklyDigest: true },
    select: { id: true, name: true, email: true, emailSignature: true },
  });

  let sent = 0;
  for (const user of users) {
    try {
      const jobs = await prisma.job.findMany({
        where: {
          photographerId: user.id,
          createdAt: { gte: weekStart, lte: weekEnd },
        },
        select: { address: true, totalPhotos: true, approvedPhotos: true, cost: true },
      });

      if (jobs.length === 0) continue; // Don't email users with no activity

      const jobCount = jobs.length;
      const photoCount = jobs.reduce((s, j) => s + j.totalPhotos, 0);
      const approvedCount = jobs.reduce((s, j) => s + j.approvedPhotos, 0);
      const totalCost = jobs.reduce((s, j) => s + j.cost, 0);
      const topAddress = jobs.sort((a, b) => b.totalPhotos - a.totalPhotos)[0]?.address;

      const baseUrl = process.env.NEXTAUTH_URL || "https://ath-editor.vercel.app";
      const ok = await sendEmail({
        to: user.email!,
        subject: `Your ATH Editor week: ${jobCount} job${jobCount === 1 ? "" : "s"}, $${totalCost.toFixed(2)}`,
        html: weeklyDigestTemplate({
          name: user.name || "there",
          weekStart: weekStart.toLocaleDateString(),
          weekEnd: weekEnd.toLocaleDateString(),
          jobCount,
          photoCount,
          approvedCount,
          totalCost,
          topAddress,
          dashboardUrl: `${baseUrl}/dashboard`,
          signature: user.emailSignature || undefined,
        }),
      });

      if (ok) sent++;
    } catch (err) {
      console.error(`[weekly-digest] user ${user.id}:`, err);
    }
  }

  return NextResponse.json({ candidates: users.length, sent });
}
