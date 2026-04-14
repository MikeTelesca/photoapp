import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ presetId: string }> }
) {
  const { presetId } = await params;
  try {
    const body = await request.json();
    const preset = await prisma.preset.update({ where: { id: presetId }, data: body });
    return NextResponse.json(preset);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ presetId: string }> }
) {
  const { presetId } = await params;
  try {
    await prisma.preset.delete({ where: { id: presetId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
