import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// POST /api/invites - admin creates an invite
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const { email, role } = body as { email?: string; role?: string };

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.invite.create({
    data: {
      token,
      email: email || null,
      role: role === "admin" ? "admin" : "photographer",
      createdById: auth.userId,
      expiresAt,
    },
  });

  return NextResponse.json({ id: invite.id, token, expiresAt });
}

// GET /api/invites - list all active invites
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const invites = await prisma.invite.findMany({
    where: { usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invites.map(i => ({
    id: i.id,
    token: i.token,
    email: i.email,
    role: i.role,
    expiresAt: i.expiresAt,
    createdAt: i.createdAt,
  })));
}
