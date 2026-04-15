import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { ids, all } = await request.json();

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
