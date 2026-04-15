import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ jobComments: [], photoComments: [] });

  // Find user's jobs first to scope
  const userJobs = await prisma.job.findMany({
    where: { photographerId: auth.userId, archivedAt: null },
    select: { id: true, address: true },
  }).catch(() => []);
  const jobIds = userJobs.map(j => j.id);
  const jobMap = new Map(userJobs.map(j => [j.id, j.address]));

  const [jobComments, photoComments] = await Promise.all([
    prisma.jobComment.findMany({
      where: {
        jobId: { in: jobIds },
        body: { contains: q, mode: "insensitive" },
      },
      include: { author: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }).catch(() => []),
    prisma.photoComment.findMany({
      where: {
        photo: { jobId: { in: jobIds } },
        message: { contains: q, mode: "insensitive" },
      },
      include: { photo: { select: { id: true, jobId: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }).catch(() => []),
  ]);

  return NextResponse.json({
    jobComments: jobComments.map((c: any) => ({
      id: c.id,
      jobId: c.jobId,
      jobAddress: jobMap.get(c.jobId) || "Unknown",
      body: c.body,
      author: c.author?.name || c.author?.email,
      createdAt: c.createdAt,
    })),
    photoComments: photoComments.map((c: any) => ({
      id: c.id,
      jobId: c.photo?.jobId,
      photoId: c.photoId,
      jobAddress: jobMap.get(c.photo?.jobId) || "Unknown",
      message: c.message,
      authorName: c.authorName,
      createdAt: c.createdAt,
    })),
  });
}
