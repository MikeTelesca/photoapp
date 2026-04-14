import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/ui/stat-card";
import { JobList } from "@/components/dashboard/job-list";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { CostTracker } from "@/components/dashboard/cost-tracker";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { FolderIcon, ArrowPathIcon, EyeIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import type { Job } from "@/lib/types";

const mockJobs: Job[] = [
  {
    id: "1", address: "123 Main Street, Toronto", photographerId: "p1", photographerName: "Mike R.",
    preset: "standard", status: "processing", totalPhotos: 72, processedPhotos: 45,
    approvedPhotos: 0, rejectedPhotos: 0, twilightCount: 0,
    createdAt: new Date(Date.now() - 35 * 60000), updatedAt: new Date(),
  },
  {
    id: "2", address: "456 Oak Avenue, Mississauga", photographerId: "p2", photographerName: "Sarah K.",
    preset: "standard", status: "review", totalPhotos: 48, processedPhotos: 48,
    approvedPhotos: 0, rejectedPhotos: 0, twilightCount: 0,
    createdAt: new Date(Date.now() - 2 * 3600000), updatedAt: new Date(),
  },
  {
    id: "3", address: "789 Pine Drive, Oakville", photographerId: "p1", photographerName: "You",
    preset: "luxury", status: "review", totalPhotos: 95, processedPhotos: 95,
    approvedPhotos: 0, rejectedPhotos: 0, twilightCount: 0,
    createdAt: new Date(Date.now() - 3 * 3600000), updatedAt: new Date(),
  },
  {
    id: "4", address: "15 Birch Lane, Burlington", photographerId: "p1", photographerName: "Mike R.",
    preset: "standard", status: "approved", totalPhotos: 38, processedPhotos: 38,
    approvedPhotos: 38, rejectedPhotos: 0, twilightCount: 1,
    createdAt: new Date(Date.now() - 24 * 3600000), updatedAt: new Date(),
  },
  {
    id: "5", address: "220 Lakeshore Blvd, Unit 1405", photographerId: "p2", photographerName: "Sarah K.",
    preset: "standard", status: "approved", totalPhotos: 32, processedPhotos: 32,
    approvedPhotos: 32, rejectedPhotos: 0, twilightCount: 0,
    createdAt: new Date(Date.now() - 24 * 3600000), updatedAt: new Date(),
  },
];

const mockActivity = [
  { id: "a1", icon: "approved" as const, highlight: "15 Birch Lane", text: "approved", time: "2 hours ago" },
  { id: "a2", icon: "uploaded" as const, highlight: "Mike R.", text: "uploaded 123 Main St", time: "35 min ago" },
  { id: "a3", icon: "regenerated" as const, highlight: "456 Oak Ave", text: "— 2 photos regenerated", time: "3 hours ago" },
];

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" subtitle="Manage your photo editing jobs" />
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Jobs" value={24} subtext="This week" icon={<FolderIcon className="w-[18px] h-[18px]" />} highlight />
          <StatCard label="Processing" value={3} subtext="~45 min left" icon={<ArrowPathIcon className="w-[18px] h-[18px]" />} iconColor="amber" />
          <StatCard label="Needs Review" value={5} subtext="289 photos" icon={<EyeIcon className="w-[18px] h-[18px]" />} iconColor="cyan" />
          <StatCard label="Approved Today" value={12} subtext="4 properties" icon={<CheckCircleIcon className="w-[18px] h-[18px]" />} iconColor="green" />
        </div>
        <div className="grid grid-cols-[1fr_340px] gap-4">
          <JobList jobs={mockJobs} />
          <div className="flex flex-col gap-4">
            <QuickActions />
            <CostTracker amount={47.2} imageCount={682} budget={150} />
            <ActivityFeed items={mockActivity} />
          </div>
        </div>
      </div>
    </>
  );
}
