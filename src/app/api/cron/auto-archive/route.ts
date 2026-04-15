import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
    }).catch(() => []);

    let totalArchived = 0;
    for (const user of users) {
      const days = (user as any).autoArchiveDays;
      if (!days || days <= 0) continue;

      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      try {
        const result = await prisma.job.updateMany({
          where: {
            photographerId: user.id,
            status: "approved",
            archivedAt: null,
            createdAt: { lt: cutoff },
          },
          data: { archivedAt: new Date() },
        });
        totalArchived += result.count;
      } catch (err) {
        console.error(`auto-archive user ${user.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      usersChecked: users.length,
      totalArchived,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron auto-archive error:", error);
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
}
