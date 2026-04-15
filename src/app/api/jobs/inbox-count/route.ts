import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const count = await prisma.job.count({
    where: {
      photographerId: auth.userId,
      status: "review",
      archivedAt: null,
    },
  }).catch(() => 0);

  return NextResponse.json({ count });
}
