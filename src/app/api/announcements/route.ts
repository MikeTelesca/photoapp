import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return NextResponse.json({ announcements });
  } catch {
    return NextResponse.json({ announcements: [] });
  }
}
