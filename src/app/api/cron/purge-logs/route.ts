import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ACTIVITY_LOG_TTL_DAYS = parseInt(process.env.ACTIVITY_LOG_TTL_DAYS || "90");
const ERROR_LOG_TTL_DAYS = parseInt(process.env.ERROR_LOG_TTL_DAYS || "30");
const LOGIN_RECORD_TTL_DAYS = parseInt(process.env.LOGIN_RECORD_TTL_DAYS || "180");

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret if provided
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Try admin session as fallback
    try {
      const { requireAdmin } = await import("@/lib/api-auth");
      const auth = await requireAdmin();
      if ("error" in auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    } catch {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = Date.now();
  const activityCutoff = new Date(now - ACTIVITY_LOG_TTL_DAYS * 24 * 60 * 60 * 1000);
  const errorCutoff = new Date(now - ERROR_LOG_TTL_DAYS * 24 * 60 * 60 * 1000);
  const loginCutoff = new Date(now - LOGIN_RECORD_TTL_DAYS * 24 * 60 * 60 * 1000);

  let activityDeleted = 0,
    errorDeleted = 0,
    loginDeleted = 0;

  try {
    const r = await prisma.activityLog.deleteMany({
      where: { createdAt: { lt: activityCutoff } },
    });
    activityDeleted = r.count;
  } catch (err) {
    console.error("activity purge err:", err);
  }

  try {
    const r = await prisma.errorLog.deleteMany({
      where: { createdAt: { lt: errorCutoff } },
    });
    errorDeleted = r.count;
  } catch (err) {
    console.error("error log purge err:", err);
  }

  try {
    const r = await prisma.loginRecord.deleteMany({
      where: { createdAt: { lt: loginCutoff } },
    });
    loginDeleted = r.count;
  } catch (err) {
    console.error("login record purge err:", err);
  }

  // Also purge old read notifications (>90 days)
  let notificationDeleted = 0;
  try {
    const notifCutoff = new Date(now - 90 * 24 * 60 * 60 * 1000);
    const r = await prisma.notification.deleteMany({
      where: { readAt: { not: null, lt: notifCutoff } },
    });
    notificationDeleted = r.count;
  } catch (err) {
    console.error("notification purge err:", err);
  }

  return NextResponse.json({
    activityDeleted,
    errorDeleted,
    loginDeleted,
    notificationDeleted,
    activityCutoff: activityCutoff.toISOString(),
    errorCutoff: errorCutoff.toISOString(),
    loginCutoff: loginCutoff.toISOString(),
  });
}
