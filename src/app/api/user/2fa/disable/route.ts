import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { password } = await request.json();
  if (!password)
    return NextResponse.json({ error: "password required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user?.password)
    return NextResponse.json({ error: "No password set" }, { status: 400 });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return NextResponse.json({ error: "Invalid password" }, { status: 400 });

  await prisma.user.update({
    where: { id: auth.userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: null },
  });

  return NextResponse.json({ ok: true });
}
