import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const IMPERSONATE_COOKIE = "ath-impersonate";

/**
 * Resolves the current session, applying cookie-based admin impersonation
 * if present. When an admin has the `ath-impersonate` cookie set to a valid
 * user id, the returned session will reflect the impersonated user, while
 * the admin's original id is preserved on `session.actualUserId`.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  let userId = session.user.id;
  let role = session.user.role as "admin" | "photographer";

  // Cookie-based impersonation: only honored if the *actual* session user is admin.
  try {
    const cookieStore = await cookies();
    const impersonatedId = cookieStore.get(IMPERSONATE_COOKIE)?.value;

    if (impersonatedId && role === "admin" && impersonatedId !== userId) {
      const target = await prisma.user.findUnique({
        where: { id: impersonatedId },
        select: { id: true, role: true },
      });
      if (target) {
        session.actualUserId = userId;
        session.impersonating = true;
        session.realUserId = userId;
        session.user.id = target.id;
        // Behave as the impersonated user's role.
        session.user.role = target.role;
        userId = target.id;
        role = target.role as "admin" | "photographer";
      }
    }
  } catch (err) {
    // Cookie store is not always available (e.g. some edge paths). Fail open —
    // impersonation is a support-only feature, not a security boundary.
    console.error("[requireUser] impersonate cookie check failed:", err);
  }

  return { userId, role, session };
}

export async function requireAdmin() {
  // Use the *actual* (non-impersonated) session to gate admin-only endpoints.
  // Without this, an admin who started impersonating a photographer would lose
  // access to the impersonate-stop endpoint and other admin APIs.
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return {
    userId: session.user.id,
    role: "admin" as const,
    session,
  };
}

export async function requireJobAccess(jobId: string) {
  const authResult = await requireUser();
  if ("error" in authResult) {
    return { error: authResult.error } as const;
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  }

  if (authResult.role !== "admin" && job.photographerId !== authResult.userId) {
    // 404 not 403 to prevent ID enumeration
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  }

  return {
    userId: authResult.userId,
    role: authResult.role,
    session: authResult.session,
    job,
  };
}
