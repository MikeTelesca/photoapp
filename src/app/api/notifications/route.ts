import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }).catch(() => []),
    prisma.notification.count({
      where: { userId: auth.userId, readAt: null },
    }).catch(() => 0),
  ]);

  return NextResponse.json({ notifications: items, unreadCount });
}
