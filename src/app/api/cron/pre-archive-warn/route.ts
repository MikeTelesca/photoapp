import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret if provided
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        autoArchiveDays: { not: null, gt: 0 },
      },
      select: { id: true, autoArchiveDays: true },
    }).catch(() => []);

    let warned = 0;
    for (const user of users) {
      const days = user.autoArchiveDays as number;
      if (!days || days <= 0) continue;

      // Jobs that will hit auto-archive in exactly 3 days from their creation
      // We want jobs created on the date that is (days - 3) days ago
      const exactDate = new Date(Date.now() - (days - 3) * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(exactDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(exactDate);
      endOfDay.setHours(23, 59, 59, 999);

      try {
        const candidates = await prisma.job.findMany({
          where: {
            photographerId: user.id,
            status: "approved",
            archivedAt: null,
            pinnedAt: null,
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }).catch(() => []);

        for (const job of candidates) {
          const daysOld = Math.floor((Date.now() - job.createdAt.getTime()) / (24 * 60 * 60 * 1000));
          const daysUntilArchive = days - daysOld;

          // Sanity check: should be very close to 3 days
          if (daysUntilArchive < 2 || daysUntilArchive > 4) continue;

          await notify({
            userId: user.id,
            type: "job-ready",
            title: `📦 Auto-archive in ${daysUntilArchive}d: ${job.address}`,
            body: `This job will be auto-archived in ${daysUntilArchive} days. Pin or change auto-archive setting to keep it visible.`,
            href: `/review/${job.id}`,
          }).catch(() => {});
          warned++;
        }
      } catch (err) {
        console.error(`pre-archive-warn user ${user.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      usersChecked: users.length,
      warned,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron pre-archive-warn error:", error);
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
}
