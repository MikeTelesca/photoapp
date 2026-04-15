import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, dailySummaryTemplate } from "@/lib/email";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();

  const users = await prisma.user.findMany({
    where: {
      dailySummary: true,
      email: {
        not: ""
      }
    },
  });

  let sent = 0;
  for (const user of users) {
    try {
      const jobs = await prisma.job.findMany({
        where: {
          photographerId: user.id,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        select: { totalPhotos: true, approvedPhotos: true, cost: true, status: true },
      });

      const photosToday = await prisma.photo.count({
        where: {
          job: { photographerId: user.id },
          updatedAt: { gte: startOfDay, lte: endOfDay },
          status: { in: ["edited", "approved", "rejected"] },
        },
      }).catch(() => 0);

      const awaitingReview = await prisma.job.count({
        where: { photographerId: user.id, status: "review", archivedAt: null },
      }).catch(() => 0);

      const spendToday = jobs.reduce((s, j) => s + (j.cost || 0), 0);

      const baseUrl = process.env.NEXTAUTH_URL || "https://ath-editor.vercel.app";
      const ok = await sendEmail({
        to: user.email!,
        subject: jobs.length > 0 || awaitingReview > 0
          ? `Today: ${jobs.length} new job${jobs.length === 1 ? "" : "s"}, ${photosToday} photo${photosToday === 1 ? "" : "s"}`
          : `Today's recap`,
        html: dailySummaryTemplate({
          name: user.name || "there",
          date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
          jobsCreated: jobs.length,
          photosProcessed: photosToday,
          awaitingReview,
          spendToday,
          dashboardUrl: `${baseUrl}/dashboard`,
          signature: user.emailSignature || undefined,
        }),
      });

      if (ok) sent++;
    } catch (err) {
      console.error(`[daily-summary] user ${user.id}:`, err);
    }
  }

  return NextResponse.json({ candidates: users.length, sent });
}
