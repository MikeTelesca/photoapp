import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await prisma.job.count({
    where: {
      photographerId: auth.userId,
      createdAt: { gte: startOfDay },
    },
  }).catch(() => 0);

  return NextResponse.json({ count });
}
