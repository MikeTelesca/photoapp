import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { testConnection } from "@/lib/dropbox";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: any = {};

  // DB
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok" };
  } catch {
    checks.database = { status: "down" };
  }

  // Dropbox
  try {
    await testConnection();
    checks.dropbox = { status: "ok" };
  } catch {
    checks.dropbox = { status: "down" };
  }

  // AI key
  checks.ai = {
    status: (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY) ? "ok" : "down",
  };

  // Email key
  checks.email = {
    status: process.env.RESEND_API_KEY ? "ok" : "down",
  };

  const allOk = Object.values(checks).every((c: any) => c.status === "ok");
  return NextResponse.json({
    status: allOk ? "operational" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  });
}
