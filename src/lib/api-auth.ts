import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as "admin" | "photographer";
  return { userId, role, session };
}

export async function requireAdmin() {
  const result = await requireUser();
  if ("error" in result) return result;
  if (result.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return result;
}

export async function requireJobAccess(jobId: string) {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  if (authResult.role !== "admin" && job.photographerId !== authResult.userId) {
    // 404 not 403 to prevent ID enumeration
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return { ...authResult, job };
}
