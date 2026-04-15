import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notify";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dueJobs = await prisma.job.findMany({
    where: {
      reminderAt: { lte: new Date(), not: null },
      reminderSent: false,
      archivedAt: null,
    },
    take: 100,
  }).catch(() => []);

  let fired = 0;
  for (const job of dueJobs) {
    try {
      await notify({
        userId: (job as any).photographerId,
        type: "job-ready",
        title: `⏰ Reminder: ${job.address}`,
        body: job.reminderNote || "You set a reminder on this job",
        href: `/review/${job.id}`,
      });

      await prisma.job.update({
        where: { id: job.id },
        data: { reminderSent: true },
      });
      fired++;
    } catch (err) {
      console.error("reminder err:", err);
    }
  }

  return NextResponse.json({ fired, checked: dueJobs.length });
}
