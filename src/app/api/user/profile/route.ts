import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { name } = body;
  if (!name || name.trim().length < 1) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data: { name: name.trim() },
  });

  return NextResponse.json({ success: true });
}
