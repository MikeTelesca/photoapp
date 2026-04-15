import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const [job, emailLogs, comments, ratings, requests] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    prisma.shareEmailLog.findMany({
      where: { jobId },
      orderBy: { sentAt: "desc" },
    }).catch(() => []),
    prisma.photoComment.findMany({
      where: { photo: { jobId } },
      include: { photo: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }).catch(() => []),
    prisma.photoRating.findMany({
      where: { photo: { jobId } },
      include: { photo: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }).catch(() => []),
    prisma.shareRequest.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
    }).catch(() => []),
  ]);

  const opens = emailLogs.filter(l => l.openedAt).length;
  const totalRatings = ratings.length;
  const avgRating = totalRatings > 0
    ? ratings.reduce((s, r) => s + r.rating, 0) / totalRatings
    : 0;

  return NextResponse.json({
    summary: {
      shareViewCount: (job as any)?.shareViewCount || 0,
      shareLastViewedAt: (job as any)?.shareLastViewedAt,
      shareFirstViewedAt: (job as any)?.shareFirstViewedAt,
      emailsSent: emailLogs.length,
      emailsOpened: opens,
      commentsCount: comments.length,
      ratingsCount: totalRatings,
      avgRating,
      requestsCount: requests.length,
    },
    emailLogs: emailLogs.slice(0, 20).map(l => ({
      id: l.id,
      toEmail: l.toEmail,
      sentAt: l.sentAt,
      openedAt: l.openedAt,
      openCount: l.openCount,
    })),
    comments: comments.slice(0, 10).map(c => ({
      id: c.id,
      authorName: c.authorName,
      message: c.message,
      photoId: c.photo?.id,
      createdAt: c.createdAt,
    })),
    ratings: ratings.slice(0, 10).map(r => ({
      id: r.id,
      authorName: r.authorName,
      rating: r.rating,
      photoId: r.photo?.id,
      createdAt: r.createdAt,
    })),
    requests: requests.slice(0, 10).map(r => ({
      id: r.id,
      fromName: r.fromName,
      fromEmail: r.fromEmail,
      message: r.message,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
    })),
  });
}
