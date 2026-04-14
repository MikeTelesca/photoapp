import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/jobs/:jobId/photos - list photos for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const photos = await prisma.photo.findMany({
    where: { jobId },
    orderBy: { orderIndex: "asc" },
  });

  return NextResponse.json(photos);
}
