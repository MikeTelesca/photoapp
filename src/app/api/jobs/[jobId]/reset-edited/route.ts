import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// Reset all "edited" photos to "pending" so they can be re-enhanced
export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const result = await prisma.photo.updateMany({
    where: { jobId, status: "edited" },
    data: { status: "pending", editedUrl: null },
  });

  return NextResponse.json({ reset: result.count });
}
