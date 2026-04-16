import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const userId = session.user.id;
  const role = session.user.role as "admin" | "photographer";
  return { userId, role, session };
}

export async function requireAdmin() {
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
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  }

  return {
    userId: authResult.userId,
    role: authResult.role,
    session: authResult.session,
    job,
  };
}
