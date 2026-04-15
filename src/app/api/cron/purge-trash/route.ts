import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Daily cron: permanently delete jobs that have been in trash for >30 days.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.job.deleteMany({
      where: {
        deletedAt: { not: null, lt: cutoff },
      },
    });

    return NextResponse.json({
      success: true,
      purged: result.count,
      cutoff: cutoff.toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron purge-trash error:", error);
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
}
