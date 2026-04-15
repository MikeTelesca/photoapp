import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import * as OTPAuth from "otpauth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { secret, code, backupCodes } = await request.json();
  if (!secret || !code)
    return NextResponse.json({ error: "secret and code required" }, { status: 400 });

  const totp = new OTPAuth.TOTP({
    issuer: "ATH Editor",
    secret: OTPAuth.Secret.fromBase32(secret),
    digits: 6,
    period: 30,
  });

  const delta = totp.validate({ token: String(code).trim(), window: 1 });
  if (delta === null) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  // Hash backup codes for storage (bcrypt with salt rounds 10)
  let hashedBackupCodes: string | null = null;
  if (Array.isArray(backupCodes) && backupCodes.length > 0) {
    const hashes = await Promise.all(
      backupCodes.map((c: string) => bcrypt.hash(String(c).trim(), 10))
    );
    hashedBackupCodes = JSON.stringify(hashes);
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorBackupCodes: hashedBackupCodes,
    },
  });

  return NextResponse.json({ ok: true });
}
