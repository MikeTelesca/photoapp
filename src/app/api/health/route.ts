import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};

  // Database
  try {
    await prisma.user.count();
    checks.database = "ok";
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    checks.database = `error: ${message}`;
  }

  // External service credentials
  checks.dropbox =
    process.env.DROPBOX_ACCESS_TOKEN || process.env.DROPBOX_REFRESH_TOKEN
      ? "configured"
      : "missing";
  checks.gemini = process.env.GOOGLE_AI_API_KEY ? "configured" : "missing";
  checks.nextauth = process.env.NEXTAUTH_SECRET ? "configured" : "missing";

  const allOk = Object.values(checks).every(
    (v) => v === "ok" || v === "configured"
  );

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  );
}
