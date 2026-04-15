import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const reports = await prisma.feedbackReport
    .findMany({
      orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: { user: { select: { name: true, email: true } } },
    })
    .catch(() => []);

  return NextResponse.json({ reports });
}
