import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/ui/stat-card";
import { JobList } from "@/components/dashboard/job-list";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { CostTracker } from "@/components/dashboard/cost-tracker";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import {
  FolderIcon,
  ArrowPathIcon,
  EyeIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { prisma } from "@/lib/db";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getStats() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalJobs, processingJobs, reviewJobs, approvedToday, monthlyCost, totalImages] =
    await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { status: "processing" } }),
      prisma.job.count({ where: { status: "review" } }),
      prisma.job.count({
        where: { status: "approved", updatedAt: { gte: startOfDay } },
      }),
      prisma.job.aggregate({
        where: { createdAt: { gte: startOfMonth } },
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
}

async function getJobs(): Promise<Job[]> {
  const dbJobs = await prisma.job.findMany({
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
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  }));
}

async function getRecentActivity() {
  const recentJobs = await prisma.job.findMany({
    where: {
      status: { in: ["approved", "review", "processing"] },
    },
    include: {
      photographer: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  return recentJobs.map((j, i) => ({
    id: `a${i}`,
    icon: (j.status === "approved"
      ? "approved"
      : j.status === "processing"
      ? "uploaded"
      : "regenerated") as "approved" | "uploaded" | "regenerated",
    highlight: j.status === "approved" ? j.address : j.photographer.name,
    text:
      j.status === "approved"
        ? "approved"
        : j.status === "processing"
        ? `uploaded ${j.address}`
        : `ready for review — ${j.totalPhotos} photos`,
    time: formatTime(j.updatedAt),
  }));
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default async function DashboardPage() {
  const [stats, jobs, activity] = await Promise.all([
    getStats(),
    getJobs(),
    getRecentActivity(),
  ]);

  return (
    <>
      <Topbar title="Dashboard" subtitle="Manage your photo editing jobs" />
      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
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
        <div className="grid grid-cols-[1fr_340px] gap-4">
          <JobList jobs={jobs} />
          <div className="flex flex-col gap-4">
            <QuickActions />
            <CostTracker
              amount={stats.monthlyCost}
              imageCount={stats.totalImages}
              budget={150}
            />
            <ActivityFeed items={activity} />
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
