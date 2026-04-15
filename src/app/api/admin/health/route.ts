import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { testConnection } from "@/lib/dropbox";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const checks: any = {};

  // DB
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = { ok: true };
  } catch (err: any) {
    checks.db = { ok: false, error: err.message };
  }

  // Dropbox
  try {
    const acc = await testConnection();
    checks.dropbox = { ok: true, account: acc.email };
  } catch (err: any) {
    checks.dropbox = { ok: false, error: err.message };
  }

  // AI (check env key presence only — no need to burn API calls)
  const aiOk = !!(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY);
  checks.ai = {
    ok: aiOk,
    hint: aiOk ? undefined : "Set GOOGLE_AI_API_KEY",
  };

  // Email
  const emailOk = !!process.env.RESEND_API_KEY;
  checks.email = {
    ok: emailOk,
    hint: emailOk ? undefined : "Set RESEND_API_KEY",
  };

  // Job stats
  const [totalJobs, processing, review, approved, stuck, totalPhotos, pendingPhotos] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { status: "processing" } }),
    prisma.job.count({ where: { status: "review" } }),
    prisma.job.count({ where: { status: "approved" } }),
    prisma.photo.count({
      where: {
        status: "processing",
        updatedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
      },
    }),
    prisma.photo.count(),
    prisma.photo.count({ where: { status: "pending" } }),
  ]);

  return NextResponse.json({
    checks,
    stats: {
      totalJobs,
      processing,
      review,
      approved,
      totalPhotos,
      pendingPhotos,
      stuckPhotos: stuck,
    },
    timestamp: new Date().toISOString(),
  });
}
