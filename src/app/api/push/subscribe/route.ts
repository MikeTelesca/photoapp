import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { endpoint, keys } = await request.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: auth.userId },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: auth.userId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { endpoint } = await request.json();
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: auth.userId },
  });
  return NextResponse.json({ ok: true });
}
