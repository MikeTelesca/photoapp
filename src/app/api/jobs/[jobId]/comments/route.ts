import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const comments = await prisma.jobComment.findMany({
    where: { jobId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true, email: true } } },
  }).catch(() => []);

  return NextResponse.json({ comments });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const { body } = await request.json();
  if (!body || !body.trim()) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }

  const created = await prisma.jobComment.create({
    data: {
      jobId,
      authorId: access.userId,
      body: body.trim().slice(0, 2000),
    },
    include: { author: { select: { name: true, email: true } } },
  });

  return NextResponse.json(created);
}
