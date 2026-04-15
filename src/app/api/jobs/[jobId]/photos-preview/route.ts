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

  const photos = await prisma.photo.findMany({
    where: {
      jobId,
      OR: [
        { status: "approved" },
        { status: "edited" },
      ],
    },
    select: { id: true, editedUrl: true, originalUrl: true },
    orderBy: { isFavorite: "desc" },
    take: 4,
  }).catch(() => []);

  return NextResponse.json({ photos });
}
