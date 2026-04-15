import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  await prisma.apiKey.updateMany({
    where: { id, userId: auth.userId },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
