import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// POST: mark the current user as onboarded (completed or skipped the product tour).
export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  await prisma.user.update({
    where: { id: auth.userId },
    data: { onboardedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}

// DELETE: reset onboarding so the product tour replays on next app load.
export async function DELETE() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  await prisma.user.update({
    where: { id: auth.userId },
    data: { onboardedAt: null },
  });

  return NextResponse.json({ success: true });
}
