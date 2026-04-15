import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const list = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ announcements: list });
  } catch {
    return NextResponse.json({ announcements: [] });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const message: string = body.message;
  // Support both `level` (new) and `type` (legacy). Default info.
  const level: string = body.level || body.type || "info";
  const type: string = body.type || body.level || "info";
  const expiresAt: Date | null = body.expiresAt ? new Date(body.expiresAt) : null;
  if (!message || !message.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });

  try {
    const created = await prisma.announcement.create({
      data: {
        message: message.trim(),
        type,
        level,
        expiresAt,
        createdBy: auth.userId,
      },
    });
    return NextResponse.json(created);
  } catch {
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}
