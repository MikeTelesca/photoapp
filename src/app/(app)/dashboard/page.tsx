import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/ui/stat-card";
import { JobList } from "@/components/dashboard/job-list";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { CostTracker } from "@/components/dashboard/cost-tracker";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { RecentActivityWidget } from "@/components/dashboard/recent-activity-widget";
import { InboxWidget } from "@/components/dashboard/inbox-widget";
import { NotificationHandler } from "@/components/notifications/notification-handler";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { WidgetWrapper } from "@/components/dashboard/widget-wrapper";
import { CustomizeButton } from "@/components/dashboard/customize-button";
import { GreetingWidget } from "@/components/dashboard/greeting-widget";
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
        prisma.job.count({ where: { ...where, status: { not: "deleted" } } }),
        prisma.job.count({ where: { ...where, status: "processing" } }),
        prisma.job.count({ where: { ...where, status: "review" } }),
        prisma.job.count({
          where: { ...where, status: "approved", updatedAt: { gte: startOfDay } },
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
    const baseWhere: any = { ...where, status: { not: "deleted" }, archivedAt: null };
    if (search) {
      baseWhere.address = { contains: search, mode: "insensitive" };
    }
    if (tag) {
      baseWhere.tags = { contains: tag, mode: "insensitive" };
    }
    const dbJobs = await prisma.job.findMany({
      where: baseWhere,
      include: {
        photographer: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return dbJobs.map((j) => ({
      id: j.id,
      address: j.address,
      photographerId: j.photographerId,
      photographerName: j.photographer.name,
      preset: j.preset as Job["preset"],
      status: j.status as Job["status"],
      totalPhotos: j.totalPhotos,
      processedPhotos: j.processedPhotos,
      approvedPhotos: j.approvedPhotos,
      rejectedPhotos: j.rejectedPhotos,
      twilightCount: j.twilightCount,
      cost: j.cost,
      clientName: j.clientName,
      tags: j.tags,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    }));
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
      <Topbar title="Dashboard" subtitle="Manage your photo editing jobs" actions={<CustomizeButton />} />
      <div className="p-6">
        {/* Greeting Widget */}
        <GreetingWidget userId={userId || ""} userName={session?.user?.name || null} />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Jobs"
            value={stats.totalJobs}
            subtext="This week"
            icon={<FolderIcon className="w-[18px] h-[18px]" />}
            highlight
          />
          <StatCard
            label="Processing"
            value={stats.processingJobs}
            subtext={stats.processingJobs > 0 ? "In progress" : "None"}
            icon={<ArrowPathIcon className="w-[18px] h-[18px]" />}
            iconColor="amber"
          />
          <StatCard
            label="Needs Review"
            value={stats.reviewJobs}
            subtext={`${stats.reviewJobs} properties`}
            icon={<EyeIcon className="w-[18px] h-[18px]" />}
            iconColor="cyan"
          />
          <StatCard
            label="Approved Today"
            value={stats.approvedToday}
            subtext="Today"
            icon={<CheckCircleIcon className="w-[18px] h-[18px]" />}
            iconColor="green"
          />
        </div>

        {/* Grid: Jobs + Right Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
          <div>
            <WidgetWrapper widgetKey="inbox">
              <InboxWidget userId={userId || ""} />
            </WidgetWrapper>
            <JobList jobs={jobs} />
          </div>
          <div className="flex flex-col gap-4">
            <WidgetWrapper widgetKey="quick-actions">
              <QuickActions />
            </WidgetWrapper>
            <WidgetWrapper widgetKey="cost-tracker">
              <CostTracker
                amount={stats.monthlyCost}
                imageCount={stats.totalImages}
                budget={150}
              />
            </WidgetWrapper>
            <WidgetWrapper widgetKey="recent-activity">
              <RecentActivityWidget userId={userId || ""} isAdmin={userRole === "admin"} />
            </WidgetWrapper>
            <WidgetWrapper widgetKey="activity-feed">
              <ActivityFeed />
            </WidgetWrapper>
          </div>
        </div>

        {/* Empty state */}
        {jobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-graphite-400 text-sm">
              No jobs yet. Click &quot;New Job&quot; to create your first one.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
