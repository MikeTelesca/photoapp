import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const logs = await prisma.shareEmailLog.findMany({
    where: { jobId },
    select: {
      id: true,
      toEmail: true,
      sentAt: true,
      openedAt: true,
      openCount: true,
    },
    orderBy: { sentAt: "desc" },
    take: 20,
  }).catch(() => []);

  // Dedupe by email, keep most recent
  const seen = new Set<string>();
  const unique = logs.filter(l => {
    if (seen.has(l.toEmail)) return false;
    seen.add(l.toEmail);
    return true;
  });

  return NextResponse.json({ recipients: unique });
}
