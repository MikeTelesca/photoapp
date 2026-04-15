import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/invites/:token - validate an invite (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await prisma.invite.findUnique({ where: { token } });

  if (!invite) return NextResponse.json({ valid: false, error: "Invite not found" }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ valid: false, error: "Invite already used" }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ valid: false, error: "Invite expired" }, { status: 410 });

  return NextResponse.json({ valid: true, email: invite.email, role: invite.role });
}

// DELETE /api/invites/:token - admin revokes an invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  await prisma.invite.delete({ where: { token } });
  return NextResponse.json({ success: true });
}
