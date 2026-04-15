import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, name, email, password } = body;

    if (!token || !name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Validate invite
    const invite = await prisma.invite.findUnique({ where: { token } });
    if (!invite) return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
    if (invite.usedAt) return NextResponse.json({ error: "Invite already used" }, { status: 410 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 410 });

    // Check email not in use
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: invite.role,
      },
    });

    // Mark invite used
    await prisma.invite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
