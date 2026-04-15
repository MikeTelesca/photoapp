import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const previous = cookieStore.get("ath-impersonate")?.value;

  cookieStore.set("ath-impersonate", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  if (previous) {
    try {
      // The real admin is the JWT "sub" / realUserId when impersonating, else the
      // session user id.
      const actualUserId = session.realUserId ?? session.user.id;
      await prisma.activityLog.create({
        data: {
          type: "admin_impersonate_stop",
          message: `Admin ${actualUserId} stopped impersonating ${previous}`,
          userId: actualUserId,
          metadata: JSON.stringify({
            adminUserId: actualUserId,
            targetUserId: previous,
          }),
        },
      });
    } catch (err) {
      console.error("[impersonate-stop] activity log failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
