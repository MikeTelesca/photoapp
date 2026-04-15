import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { name, emailNotifications } = body;

  const updateData: Record<string, any> = {};

  if (name !== undefined) {
    if (!name || name.trim().length < 1) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    updateData.name = name.trim();
  }

  if (emailNotifications !== undefined) {
    updateData.emailNotifications = Boolean(emailNotifications);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}
