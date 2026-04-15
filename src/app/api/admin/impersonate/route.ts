import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // The client will call useSession().update({ impersonatedUserId: userId })
  return NextResponse.json({ ok: true, targetName: target.name || target.email });
}

export async function DELETE() {
  // Simply return ok — client calls update({ impersonatedUserId: null })
  return NextResponse.json({ ok: true });
}
