import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const events: Array<{ at: Date; type: string; title: string; detail?: string }> = [];

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Job created
  events.push({
    at: job.createdAt,
    type: "created",
    title: "Job created",
    detail: `${job.totalPhotos || 0} photos at ${job.address}`,
  });

  // Activity logs referencing this job (search metadata)
  const activityLogs = await prisma.activityLog
    .findMany({
      where: {
        jobId: jobId,
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    })
    .catch(() => []);

  for (const log of activityLogs) {
    events.push({
      at: log.createdAt,
      type: "activity",
      title: log.message,
    });
  }

  // Photo status transitions — just aggregate counts
  const photos = await prisma.photo.findMany({
    where: { jobId },
    select: { status: true, updatedAt: true },
  });

  const firstEdited = photos
    .filter(
      (p) =>
        p.status === "edited" ||
        p.status === "approved" ||
        p.status === "rejected"
    )
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())[0];
  if (firstEdited) {
    events.push({
      at: firstEdited.updatedAt,
      type: "processing",
      title: "First photo enhanced",
    });
  }

  const approvedCount = photos.filter((p) => p.status === "approved").length;
  const rejectedCount = photos.filter((p) => p.status === "rejected").length;
  const lastApprove = photos
    .filter((p) => p.status === "approved")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  if (lastApprove) {
    events.push({
      at: lastApprove.updatedAt,
      type: "approved",
      title: `${approvedCount} photos approved`,
      detail:
        rejectedCount > 0 ? `${rejectedCount} rejected` : undefined,
    });
  }

  // Share activity
  if (job.shareEnabled && job.shareToken) {
    events.push({
      at: job.updatedAt || job.createdAt,
      type: "share",
      title: "Share link enabled",
      detail: job.sharePassword ? "password protected" : "public",
    });
  }

  // Error log entries for this job
  const errors = await prisma.errorLog
    .findMany({
      where: { jobId },
      orderBy: { createdAt: "asc" },
      take: 20,
    })
    .catch(() => []);
  for (const err of errors) {
    events.push({
      at: err.createdAt,
      type: "error",
      title: `Error: ${err.source}`,
      detail: err.message,
    });
  }

  // Sort events by time
  events.sort((a, b) => a.at.getTime() - b.at.getTime());

  return NextResponse.json({ events });
}
