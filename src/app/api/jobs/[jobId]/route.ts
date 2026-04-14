import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/jobs/:jobId - get a single job with its photos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      photographer: {
        select: { id: true, name: true, email: true },
      },
      photos: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}

// PATCH /api/jobs/:jobId - update a job
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const body = await request.json();

  const job = await prisma.job.update({
    where: { id: jobId },
    data: body,
    include: {
      photographer: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json(job);
}

// DELETE /api/jobs/:jobId - delete a job and its photos
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  await prisma.job.delete({ where: { id: jobId } });

  return NextResponse.json({ success: true });
}
