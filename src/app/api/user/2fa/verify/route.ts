import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import * as OTPAuth from "otpauth";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { secret, code } = await request.json();
  if (!secret || !code)
    return NextResponse.json({ error: "secret and code required" }, { status: 400 });

  const totp = new OTPAuth.TOTP({
    issuer: "ATH Editor",
    secret: OTPAuth.Secret.fromBase32(secret),
    digits: 6,
    period: 30,
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data: { twoFactorEnabled: true, twoFactorSecret: secret },
  });

  return NextResponse.json({ ok: true });
}
