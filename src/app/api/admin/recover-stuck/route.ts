import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// POST /api/admin/recover-stuck - reset photos stuck in "processing" for >5 minutes
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const result = await prisma.photo.updateMany({
      where: {
        status: "processing",
        updatedAt: { lt: fiveMinutesAgo },
      },
      data: { status: "pending" },
    });

    return NextResponse.json({
      success: true,
      reset: result.count,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
