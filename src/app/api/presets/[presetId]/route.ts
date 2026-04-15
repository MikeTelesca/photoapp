import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ presetId: string }> }
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { presetId } = await params;
  try {
    const body = await request.json();

    // Mass assignment defense: whitelist allowed fields
    const allowed: Record<string, any> = {};
    const allowedFields = ["name", "description", "promptModifiers"] as const;
    for (const field of allowedFields) {
      if (body[field] !== undefined) allowed[field] = body[field];
    }

    const preset = await prisma.preset.update({ where: { id: presetId }, data: allowed });
    return NextResponse.json(preset);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ presetId: string }> }
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { presetId } = await params;
  try {
    await prisma.preset.delete({ where: { id: presetId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
