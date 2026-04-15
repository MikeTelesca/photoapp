import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Use the real admin id (if this admin is already impersonating, that's fine —
  // requireAdmin won't pass unless the underlying session is an admin).
  const actualUserId = auth.session.realUserId ?? auth.userId;

  if (userId === actualUserId) {
    return NextResponse.json(
      { error: "Cannot impersonate yourself" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set("ath-impersonate", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Session cookie (no maxAge) — cleared when browser closes.
  });

  // Log the action to ActivityLog (model exists in schema).
  try {
    await prisma.activityLog.create({
      data: {
        type: "admin_impersonate_start",
        message: `Admin ${actualUserId} started impersonating ${target.email}`,
        userId: actualUserId,
        metadata: JSON.stringify({
          adminUserId: actualUserId,
          targetUserId: userId,
          targetEmail: target.email,
        }),
      },
    });
  } catch (err) {
    console.error("[impersonate] activity log failed:", err);
  }

  return NextResponse.json({
    ok: true,
    targetId: target.id,
    targetName: target.name || target.email,
  });
}
