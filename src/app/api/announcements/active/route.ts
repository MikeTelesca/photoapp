import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

/**
 * Returns currently active, non-expired announcements.
 * Requires an authenticated user (any role).
 */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      where: {
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return NextResponse.json({ announcements });
  } catch {
    return NextResponse.json({ announcements: [] });
  }
}
