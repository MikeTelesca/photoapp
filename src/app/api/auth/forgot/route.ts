import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  // Always return ok to prevent account enumeration
  if (!user) return NextResponse.json({ ok: true });

  // Invalidate any previous tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "https://ath-editor.vercel.app";
  const resetUrl = `${baseUrl}/reset?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your ATH Editor password",
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #111; font-size: 24px;">Reset your password</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.5;">
          Click the button below to set a new password. This link expires in 1 hour.
        </p>
        <a href="${resetUrl}" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset password</a>
        <p style="color: #999; font-size: 13px; margin-top: 40px;">
          If you didn't request this, ignore this email. Your password stays unchanged.
        </p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
