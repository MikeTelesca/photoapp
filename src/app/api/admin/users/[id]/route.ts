import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

const ALLOWED_TIERS = ["standard", "pro", "unlimited", "banned"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const data: { rateLimitTier?: string } = {};

    if (typeof body.rateLimitTier === "string") {
      if (!ALLOWED_TIERS.includes(body.rateLimitTier as (typeof ALLOWED_TIERS)[number])) {
        return NextResponse.json(
          { error: `Invalid rateLimitTier. Must be one of: ${ALLOWED_TIERS.join(", ")}` },
          { status: 400 }
        );
      }
      data.rateLimitTier = body.rateLimitTier;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No updatable fields supplied" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, rateLimitTier: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
