import { requireJobAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const authResult = await requireJobAccess(jobId);
  if ("error" in authResult) return authResult.error;

  const body = await req.json().catch(() => ({}));
  const expiresAt = body?.expiresAt;

  let expiry: Date | null = null;
  if (expiresAt !== null && expiresAt !== undefined) {
    if (typeof expiresAt === "string" && expiresAt.length > 0) {
      const d = new Date(expiresAt);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "Invalid expiresAt timestamp" },
          { status: 400 }
        );
      }
      expiry = d;
    }
  }

  const job = await prisma.job.update({
    where: { id: jobId },
    data: { shareExpiresAt: expiry },
    select: { shareExpiresAt: true },
  });

  return NextResponse.json({
    shareExpiresAt: job.shareExpiresAt ? job.shareExpiresAt.toISOString() : null,
  });
}
