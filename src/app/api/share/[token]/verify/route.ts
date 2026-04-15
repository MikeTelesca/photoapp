import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { password } = await request.json();

  const job = await prisma.job.findFirst({
    where: { shareToken: token, shareEnabled: true },
  });
  if (!job) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  if (!job.sharePassword) {
    // No password required
    return NextResponse.json({ ok: true, noPassword: true });
  }

  const ok = await bcrypt.compare(password || "", job.sharePassword);
  if (!ok) return NextResponse.json({ error: "Wrong password" }, { status: 401 });

  // Set a signed cookie token proving they unlocked this share
  const verifyToken = crypto
    .createHmac("sha256", process.env.NEXTAUTH_SECRET || "secret")
    .update(`${token}:${job.sharePassword}`)
    .digest("hex");

  const res = NextResponse.json({ ok: true });
  res.cookies.set(`share-unlock-${token}`, verifyToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24h
    path: "/",
  });
  return res;
}
