import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  // Aggregate recent events from various sources
  const oneDay = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [recentSignups, recentJobs, recentErrors, recentFeedback] = await Promise.all([
    prisma.user.findMany({
      where: { createdAt: { gte: oneDay } },
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }).catch(() => []),
    prisma.job.count({
      where: { createdAt: { gte: oneDay } },
    }).catch(() => 0),
    prisma.errorLog.count({
      where: { createdAt: { gte: oneDay } },
    }).catch(() => 0),
    prisma.feedbackReport.count({
      where: { createdAt: { gte: oneDay }, resolved: false },
    }).catch(() => 0),
  ]);

  return NextResponse.json({
    period: "24h",
    signups: recentSignups,
    jobsCreated: recentJobs,
    errorsLogged: recentErrors,
    pendingFeedback: recentFeedback,
  });
}
