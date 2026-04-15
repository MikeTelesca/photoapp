import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { password, confirmation } = await request.json();

  if (confirmation !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user || !user.password) {
    return NextResponse.json({ error: "Cannot delete this account type" }, { status: 400 });
  }

  // Verify password
  const ok = await bcrypt.compare(password || "", user.password);
  if (!ok) {
    return NextResponse.json({ error: "Wrong password" }, { status: 400 });
  }

  // Prevent deletion of last admin
  if (user.role === "admin") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Cannot delete the last admin account" }, { status: 400 });
    }
  }

  // Cascade-delete user (Prisma should handle related records via onDelete: Cascade)
  await prisma.user.delete({ where: { id: auth.userId } });

  return NextResponse.json({ ok: true });
}
