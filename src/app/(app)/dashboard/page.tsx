import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/ui/stat-card";
import { JobList } from "@/components/dashboard/job-list";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { CostTracker } from "@/components/dashboard/cost-tracker";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { RecentActivityWidget } from "@/components/dashboard/recent-activity-widget";
import { RecentlyViewedWidget } from "@/components/dashboard/recently-viewed-widget";
import { InboxWidget } from "@/components/dashboard/inbox-widget";
import { NotificationHandler } from "@/components/notifications/notification-handler";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { WidgetWrapper } from "@/components/dashboard/widget-wrapper";
import { CustomizeButton } from "@/components/dashboard/customize-button";
import { GreetingWidget } from "@/components/dashboard/greeting-widget";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { PhotoStatsWidget } from "@/components/dashboard/photo-stats-widget";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
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
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-graphite-900 dark:text-white">
              {session?.user?.name ? `Hey, ${session.user.name.split(" ")[0]}.` : "Dashboard"}
            </h1>
            <p className="text-sm text-graphite-500 dark:text-graphite-400 mt-1">
              {stats.reviewJobs > 0
                ? `${stats.reviewJobs} job${stats.reviewJobs === 1 ? "" : "s"} waiting on your review.`
                : stats.processingJobs > 0
                ? `${stats.processingJobs} job${stats.processingJobs === 1 ? "" : "s"} processing.`
                : "No jobs in flight."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <StatCard label="Total jobs" value={stats.totalJobs} subtext="This week" icon={<FolderIcon className="w-[18px] h-[18px]" />} />
          <StatCard label="Processing" value={stats.processingJobs} subtext={stats.processingJobs > 0 ? "In progress" : "None"} icon={<ArrowPathIcon className="w-[18px] h-[18px]" />} />
          <StatCard label="Needs review" value={stats.reviewJobs} subtext={`${stats.reviewJobs} propert${stats.reviewJobs === 1 ? "y" : "ies"}`} icon={<EyeIcon className="w-[18px] h-[18px]" />} />
          <StatCard label="Approved today" value={stats.approvedToday} subtext="Today" icon={<CheckCircleIcon className="w-[18px] h-[18px]" />} />
        </div>

        <JobList jobs={jobs} />

        {jobs.length === 0 && (
          <div className="text-center py-16 rounded-xl border border-dashed border-graphite-200 dark:border-graphite-800 bg-white/40 dark:bg-graphite-900/40">
            <p className="text-graphite-500 dark:text-graphite-400 text-sm mb-3">
              No jobs yet.
            </p>
            <a
              href="/jobs/new"
              className="inline-block px-4 py-2 rounded-md bg-cyan-500 text-white font-medium text-sm hover:bg-cyan-600"
            >
              Create your first job
            </a>
          </div>
        )}
      </div>
    </>
  );
}
