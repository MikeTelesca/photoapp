import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  try {
    await prisma.announcement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await request.json();
  const allowed: any = {};
  if ("active" in body) allowed.active = !!body.active;
  if ("message" in body) allowed.message = String(body.message).trim();
  if ("type" in body) allowed.type = String(body.type);
  if ("level" in body) allowed.level = String(body.level);
  if ("expiresAt" in body) allowed.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  try {
    const updated = await prisma.announcement.update({ where: { id }, data: allowed });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}
