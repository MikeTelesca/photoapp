import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, welcomeTemplate } from "@/lib/email";
import { generateUniqueReferralCode } from "@/lib/referral-code";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, name, email, password, referralCode } = body;

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

    // Resolve optional referral code to referring user id
    let referredByUserId: string | null = null;
    if (typeof referralCode === "string" && referralCode.trim().length > 0) {
      const normalized = referralCode.trim().toUpperCase();
      const referrer = await prisma.user.findUnique({
        where: { referralCode: normalized },
        select: { id: true },
      });
      if (referrer) referredByUserId = referrer.id;
    }

    // Create user with auto-generated unique referral code
    const hashedPassword = await bcrypt.hash(password, 10);
    const newReferralCode = await generateUniqueReferralCode();
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: invite.role,
        referralCode: newReferralCode,
        referredByUserId,
      },
    });

    // Mark invite used
    await prisma.invite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });

    // Send welcome email
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "https://ath-editor.vercel.app";
      await sendEmail({
        to: user.email,
        subject: "Welcome to ATH AI Editor 🎉",
        html: welcomeTemplate({
          name: user.name || "there",
          loginUrl: `${baseUrl}/login`,
        }),
      });
    } catch (err) {
      console.error("[welcome-email] failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
