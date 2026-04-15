import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const { resolved } = await request.json();
  await prisma.feedbackReport.update({
    where: { id },
    data: { resolved: !!resolved },
  });
  return NextResponse.json({ ok: true });
}
