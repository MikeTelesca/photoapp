import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const { token, password } = await request.json();
  if (!token || !password) return NextResponse.json({ error: "token and password required" }, { status: 400 });

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const reset = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: reset.userId },
    data: { password: hashed },
  });
  await prisma.passwordResetToken.update({
    where: { id: reset.id },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
