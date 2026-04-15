import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

interface TimelineEvent {
  type: string;
  at: string;
  label: string;
  sublabel?: string;
  icon?: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const events: TimelineEvent[] = [];

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 1. Job created
  events.push({
    type: "created",
    at: job.createdAt.toISOString(),
    label: "Job created",
    sublabel: `${job.totalPhotos || 0} photos · ${job.address}`,
    icon: "plus",
  });

  // 2. Status change (derived from updatedAt + status)
  if (job.updatedAt && job.status && job.updatedAt.getTime() !== job.createdAt.getTime()) {
    events.push({
      type: "status",
      at: job.updatedAt.toISOString(),
      label: `Status: ${job.status}`,
      sublabel: `Priority: ${job.priority}`,
      icon: "status",
    });
  }

  // 3. ActivityLog entries — may not exist in all DBs
  try {
    const activityLogs = await prisma.activityLog.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    for (const log of activityLogs) {
      events.push({
        type: "activity",
        at: log.createdAt.toISOString(),
        label: log.message,
        sublabel: log.type,
        icon: "activity",
      });
    }
  } catch {
    // table missing — ignore
  }

  // 4. JobComments
  try {
    const comments = await prisma.jobComment.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { author: { select: { name: true, email: true } } },
    });
    for (const c of comments) {
      const bodyPreview =
        c.body.length > 80 ? c.body.slice(0, 80) + "…" : c.body;
      events.push({
        type: "comment",
        at: c.createdAt.toISOString(),
        label: `${c.author?.name || c.author?.email || "Someone"} commented`,
        sublabel: bodyPreview,
        icon: "chat",
      });
    }
  } catch {
    // ignore
  }

  // 5. ShareEmailLog
  try {
    const shares = await prisma.shareEmailLog.findMany({
      where: { jobId },
      orderBy: { sentAt: "desc" },
      take: 50,
    });
    for (const s of shares) {
      events.push({
        type: "share",
        at: s.sentAt.toISOString(),
        label: `Share link emailed to ${s.toEmail}`,
        sublabel: s.openedAt
          ? `Opened ${s.openCount} time${s.openCount === 1 ? "" : "s"}`
          : "Not yet opened",
        icon: "mail",
      });
    }
  } catch {
    // ignore
  }

  // 6. DownloadLog
  try {
    const downloads = await prisma.downloadLog.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    for (const d of downloads) {
      events.push({
        type: "download",
        at: d.createdAt.toISOString(),
        label: `Download: ${d.type}`,
        sublabel: d.count != null ? `${d.count} file${d.count === 1 ? "" : "s"}` : undefined,
        icon: "download",
      });
    }
  } catch {
    // ignore
  }

  // 7. Photo approvals/rejections — aggregate by day
  try {
    const photos = await prisma.photo.findMany({
      where: {
        jobId,
        status: { in: ["approved", "rejected", "edited"] },
      },
      select: { status: true, updatedAt: true },
    });

    const buckets = new Map<string, { approved: number; rejected: number; edited: number; latest: Date }>();
    for (const p of photos) {
      const day = p.updatedAt.toISOString().slice(0, 10);
      const b = buckets.get(day) || { approved: 0, rejected: 0, edited: 0, latest: p.updatedAt };
      if (p.status === "approved") b.approved++;
      else if (p.status === "rejected") b.rejected++;
      else if (p.status === "edited") b.edited++;
      if (p.updatedAt > b.latest) b.latest = p.updatedAt;
      buckets.set(day, b);
    }

    for (const [, b] of buckets) {
      const parts: string[] = [];
      if (b.approved) parts.push(`${b.approved} approved`);
      if (b.rejected) parts.push(`${b.rejected} rejected`);
      if (b.edited) parts.push(`${b.edited} enhanced`);
      if (parts.length === 0) continue;
      events.push({
        type: b.approved ? "approved" : b.rejected ? "rejected" : "processing",
        at: b.latest.toISOString(),
        label: parts.join(" · "),
        icon: b.approved ? "check" : b.rejected ? "x" : "spark",
      });
    }
  } catch {
    // ignore
  }

  // Sort desc by time
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return NextResponse.json({ events });
}
