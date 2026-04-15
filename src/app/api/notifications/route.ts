import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }).catch(() => []),
    prisma.notification.count({
      where: { userId: auth.userId, readAt: null },
    }).catch(() => 0),
  ]);

  return NextResponse.json({ notifications: items, unreadCount });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const { ids, all } = body as { ids?: string[]; all?: boolean };

  if (all) {
    await prisma.notification.updateMany({
      where: { userId: auth.userId, readAt: null },
      data: { readAt: new Date() },
    });
  } else if (Array.isArray(ids) && ids.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId: auth.userId },
      data: { readAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
