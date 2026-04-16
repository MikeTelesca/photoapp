import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { StatCard } from "@/components/ui/stat-card";
import { JobList } from "@/components/dashboard/job-list";
import { NotificationHandler } from "@/components/notifications/notification-handler";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { WeeklyActivity } from "@/components/dashboard/weekly-activity";
import {
  FolderIcon,
  ArrowPathIcon,
  EyeIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { prisma } from "@/lib/db";
import type { Job } from "@/lib/types";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getStats(where: object) {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalJobs, processingJobs, reviewJobs, approvedToday, monthlyCost, totalImages] =
      await Promise.all([
        prisma.job.count({ where: { ...where, status: { not: "deleted" }, deletedAt: null } }),
        prisma.job.count({ where: { ...where, status: "processing", deletedAt: null } }),
        prisma.job.count({ where: { ...where, status: "review", deletedAt: null } }),
        prisma.job.count({
          where: { ...where, status: "approved", deletedAt: null, updatedAt: { gte: startOfDay } },
        }),
        // Keep cost aggregation INCLUDING deleted jobs so monthly cost is preserved
        prisma.job.aggregate({
          where: { ...where, createdAt: { gte: startOfMonth } },
          _sum: { cost: true },
        }),
        prisma.photo.count({
          where: { status: { not: "pending" }, createdAt: { gte: startOfMonth } },
        }),
      ]);

    return {
      totalJobs,
      processingJobs,
      reviewJobs,
      approvedToday,
      monthlyCost: monthlyCost._sum.cost || 0,
      totalImages,
    };
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return {
      totalJobs: 0,
      processingJobs: 0,
      reviewJobs: 0,
      approvedToday: 0,
      monthlyCost: 0,
      totalImages: 0,
    };
  }
}

async function getJobs(where: object, search?: string, tag?: string): Promise<Job[]> {
  try {
    const baseWhere: any = {
      AND: [
        { ...where, status: { not: "deleted" }, deletedAt: null, archivedAt: null },
        {
          OR: [
            { snoozedUntil: null },
            { snoozedUntil: { lte: new Date() } },
          ],
        },
      ],
    };
    if (search) {
      baseWhere.AND[0].address = { contains: search, mode: "insensitive" };
    }
    if (tag) {
      baseWhere.AND[0].tags = { contains: tag, mode: "insensitive" };
    }
    const dbJobs = await prisma.job.findMany({
      where: baseWhere,
      include: {
        photographer: {
          select: { name: true },
        },
      },
      orderBy: [
        { pinnedAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      take: 20,
    });

    // Fetch cover photos
    const coverIds = dbJobs.map(j => j.coverPhotoId).filter(Boolean) as string[];
    const coverPhotos = coverIds.length > 0 ? await prisma.photo.findMany({
      where: { id: { in: coverIds } },
      select: { id: true, editedUrl: true, originalUrl: true },
    }) : [];
    const coverMap = new Map(coverPhotos.map(p => [p.id, p.editedUrl || p.originalUrl]));

    const jobs = dbJobs.map((j) => ({
      id: j.id,
      address: j.address,
      photographerId: j.photographerId,
      photographerName: j.photographer.name,
      preset: j.preset as Job["preset"],
      priority: j.priority,
      status: j.status as Job["status"],
      totalPhotos: j.totalPhotos,
      processedPhotos: j.processedPhotos,
      approvedPhotos: j.approvedPhotos,
      rejectedPhotos: j.rejectedPhotos,
      twilightCount: j.twilightCount,
      cost: j.cost,
      clientName: j.clientName,
      tags: j.tags,
      pinnedAt: j.pinnedAt,
      snoozedUntil: j.snoozedUntil,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
      coverPhotoId: j.coverPhotoId,
      coverPhotoUrl: j.coverPhotoId ? coverMap.get(j.coverPhotoId) : null,
      clientApprovalStatus: j.clientApprovalStatus ?? null,
      clientApprovedAt: j.clientApprovedAt,
      clientApprovalNote: j.clientApprovalNote ?? null,
    }));

    // Sort by pinned status, then by priority, then by creation date
    jobs.sort((a, b) => {
      const aPin = a.pinnedAt ? 1 : 0;
      const bPin = b.pinnedAt ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const ap = priorityOrder[a.priority || "medium"] ?? 1;
      const bp = priorityOrder[b.priority || "medium"] ?? 1;
      if (ap !== bp) return ap - bp;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return jobs;
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return [];
  }
}


export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const search = params.search;
  const tag = params.tag;

  const session = await auth();
  const userId = session?.user?.id;
  const userRole = session?.user?.role;
  const where = userRole === "admin" ? {} : { photographerId: userId };

  const [stats, jobs] = await Promise.all([
    getStats(where),
    getJobs(where, search, tag),
  ]);

  return (
    <>
      <AutoRefresh enabled={stats.processingJobs > 0} />
      <NotificationHandler jobs={jobs.map(j => ({
        id: j.id,
        address: j.address,
        totalPhotos: j.totalPhotos,
        processedPhotos: j.processedPhotos,
        status: j.status,
      }))} />
      <OnboardingTour hasJobs={jobs.length > 0} />
      {/* per design-system/batchbase/pages/dashboard.md — 1400px data-dense container */}
      <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
        {/* 1. Page header */}
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan mb-1.5">
              Dashboard
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-graphite-900 dark:text-white">
              {session?.user?.name
                ? `Welcome back, ${session.user.name.split(" ")[0]}`
                : "Welcome back"}
            </h1>
            <p className="text-sm text-graphite-500 dark:text-graphite-400 mt-1.5">
              {stats.reviewJobs > 0
                ? `${stats.reviewJobs} job${stats.reviewJobs === 1 ? "" : "s"} waiting on your review.`
                : stats.processingJobs > 0
                ? `${stats.processingJobs} job${stats.processingJobs === 1 ? "" : "s"} processing.`
                : "No jobs in flight."}
            </p>
          </div>
        </header>

        {/* 2. KPI strip — 4 across lg, 2 across md */}
        <section
          aria-label="Key metrics"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            label="Total jobs"
            value={stats.totalJobs}
            subtext="this week"
            accent="cyan"
            icon={<FolderIcon className="w-4 h-4" />}
          />
          <StatCard
            label="Processing"
            value={stats.processingJobs}
            subtext={stats.processingJobs > 0 ? "in progress" : "idle"}
            accent="violet"
            icon={<ArrowPathIcon className="w-4 h-4" />}
            progress={stats.totalJobs ? (stats.processingJobs / stats.totalJobs) * 100 : 0}
          />
          <StatCard
            label="Needs review"
            value={stats.reviewJobs}
            subtext={`${stats.reviewJobs} propert${stats.reviewJobs === 1 ? "y" : "ies"}`}
            accent="amber"
            icon={<EyeIcon className="w-4 h-4" />}
            progress={stats.totalJobs ? (stats.reviewJobs / stats.totalJobs) * 100 : 0}
          />
          <StatCard
            label="Approved today"
            value={stats.approvedToday}
            subtext="today"
            accent="emerald"
            icon={<CheckCircleIcon className="w-4 h-4" />}
          />
        </section>

        {/* 3. Weekly activity chart */}
        <section aria-label="Weekly activity">
          <WeeklyActivity />
        </section>

        {/* 4. Live progress banner — only when something is actively processing */}
        {stats.processingJobs > 0 && (
          <div className="relative overflow-hidden rounded-xl border border-cyan/30 bg-gradient-to-r from-cyan/10 via-cyan/5 to-transparent px-4 py-3 flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan" />
            </span>
            <p className="text-sm text-graphite-800 dark:text-graphite-100">
              <span className="font-semibold tabular-nums">{stats.processingJobs}</span>{" "}
              job{stats.processingJobs === 1 ? "" : "s"} processing —{" "}
              <span className="tabular-nums">{stats.totalImages}</span> photos enhanced this month.
            </p>
            <span className="ml-auto text-[10px] uppercase tracking-wide text-cyan font-semibold">
              Live
            </span>
          </div>
        )}

        {/* 5. Jobs area */}
        <section aria-label="Jobs">
          <JobList jobs={jobs} />
        </section>

        {jobs.length === 0 && (
          <div className="text-center py-16 rounded-xl border border-dashed border-graphite-200 dark:border-graphite-800 bg-white/40 dark:bg-graphite-900/40">
            <p className="text-graphite-500 dark:text-graphite-400 text-sm mb-3">
              No jobs yet.
            </p>
            <a
              href="/jobs/new"
              className="inline-flex items-center h-9 px-3.5 rounded-lg bg-cyan text-white font-semibold text-sm hover:bg-cyan/90 shadow-sm shadow-cyan/20"
            >
              Create your first job
            </a>
          </div>
        )}
      </div>
    </>
  );
}
