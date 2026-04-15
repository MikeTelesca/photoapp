import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { action, ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No ids" }, { status: 400 });
  }

  if (action === "delete") {
    // Only delete clients with no jobs
    const clientsWithJobs = await prisma.client.findMany({
      where: {
        id: { in: ids },
        ownerId: auth.userId,
        jobs: { some: {} },
      },
      select: { id: true },
    });

    const protectedIds = new Set(clientsWithJobs.map(c => c.id));
    const safeToDelete = ids.filter((id: string) => !protectedIds.has(id));

    const result = await prisma.client.deleteMany({
      where: { id: { in: safeToDelete }, ownerId: auth.userId },
    });

    return NextResponse.json({
      deleted: result.count,
      skipped: protectedIds.size,
      message: protectedIds.size > 0 ? `Skipped ${protectedIds.size} clients with active jobs` : undefined,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
