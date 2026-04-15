import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import {
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  PhotoIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { ClientDetailActions } from "@/components/clients/client-detail-actions";
import { MergeClientButton } from "@/components/clients/merge-client-button";
import { ClientMonthlyChart } from "@/components/clients/client-monthly-chart";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

type JobRow = {
  id: string;
  address: string;
  status: string;
  totalPhotos: number;
  processedPhotos: number;
  cost: number;
  createdAt: Date;
};

export default async function ClientDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { id } = await params;

  let client:
    | {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        company: string | null;
        notes: string | null;
        defaultPreset: string | null;
        defaultTags: string | null;
        ownerId: string;
        createdAt: Date;
        jobs: JobRow[];
      }
    | null = null;

  try {
    const where =
      session.user.role === "admin"
        ? { id }
        : { id, ownerId: session.user.id };

    client = await (prisma as any).client.findFirst({
      where,
      include: {
        jobs: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            address: true,
            status: true,
            totalPhotos: true,
            processedPhotos: true,
            cost: true,
            createdAt: true,
          },
        },
      },
    });
  } catch {
    // Table may not exist yet
  }

  if (!client) notFound();

  const allJobs = client.jobs;
  const recentJobs = allJobs.slice(0, 10);

  // Stats calculations
  const totalJobs = allJobs.length;
  const totalPhotos = allJobs.reduce((sum, j) => sum + (j.totalPhotos || 0), 0);
  const totalSpent = allJobs.reduce((sum, j) => sum + (j.cost || 0), 0);
  const avgPhotosPerJob = totalJobs > 0 ? totalPhotos / totalJobs : 0;
  const lastJobDate = allJobs[0]?.createdAt || null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const jobsThisMonth = allJobs.filter(
    (j) => new Date(j.createdAt) >= startOfMonth,
  ).length;

  // Build last-12-months aggregation
  const monthBuckets: Array<{ key: string; month: string; jobs: number; photos: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    monthBuckets.push({ key, month: label, jobs: 0, photos: 0 });
  }
  const monthIndex = new Map(monthBuckets.map((b, i) => [b.key, i]));
  for (const job of allJobs) {
    const d = new Date(job.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const idx = monthIndex.get(key);
    if (idx !== undefined) {
      monthBuckets[idx].jobs += 1;
      monthBuckets[idx].photos += job.totalPhotos || 0;
    }
  }
  const chartData = monthBuckets.map((b) => ({
    month: b.month,
    jobs: b.jobs,
    photos: b.photos,
  }));

  const statusColors: Record<string, string> = {
    pending: "bg-graphite-100 text-graphite-600 dark:bg-graphite-700 dark:text-graphite-300",
    processing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    review: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const stats: Array<{
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { label: "Total jobs", value: String(totalJobs), icon: BriefcaseIcon },
    { label: "This month", value: String(jobsThisMonth), icon: CalendarDaysIcon },
    { label: "Total photos", value: String(totalPhotos), icon: PhotoIcon },
    {
      label: "Total spent",
      value: `$${totalSpent.toFixed(2)}`,
      icon: CurrencyDollarIcon,
    },
    {
      label: "Avg photos/job",
      value: avgPhotosPerJob.toFixed(1),
      icon: ChartBarIcon,
    },
    {
      label: "Last job",
      value: lastJobDate
        ? new Date(lastJobDate).toLocaleDateString()
        : "—",
      icon: ClockIcon,
    },
  ];

  return (
    <>
      <Topbar title={client.name} subtitle={client.company || "Client detail"} />
      <div className="p-6 max-w-5xl space-y-6">
        {/* Info card */}
        <Card>
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-base font-bold text-graphite-900 dark:text-white">{client.name}</h2>
              <div className="flex flex-col gap-3 items-end">
                <ClientDetailActions client={client} />
                <MergeClientButton clientId={client.id} clientName={client.name} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {client.email && (
                <div className="flex items-center gap-2 text-sm text-graphite-600 dark:text-graphite-300">
                  <EnvelopeIcon className="w-4 h-4 text-graphite-400 flex-shrink-0" />
                  <a href={`mailto:${client.email}`} className="hover:text-cyan transition-colors">
                    {client.email}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-sm text-graphite-600 dark:text-graphite-300">
                  <PhoneIcon className="w-4 h-4 text-graphite-400 flex-shrink-0" />
                  <a href={`tel:${client.phone}`} className="hover:text-cyan transition-colors">
                    {client.phone}
                  </a>
                </div>
              )}
              {client.company && (
                <div className="flex items-center gap-2 text-sm text-graphite-600 dark:text-graphite-300">
                  <BuildingOfficeIcon className="w-4 h-4 text-graphite-400 flex-shrink-0" />
                  {client.company}
                </div>
              )}
              {client.notes && (
                <div className="flex items-start gap-2 text-sm text-graphite-600 dark:text-graphite-300 sm:col-span-2">
                  <DocumentTextIcon className="w-4 h-4 text-graphite-400 flex-shrink-0 mt-0.5" />
                  <span className="whitespace-pre-wrap">{client.notes}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-cyan" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">
                      {s.label}
                    </span>
                  </div>
                  <div className="text-xl font-bold text-graphite-900 dark:text-white">
                    {s.value}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Chart */}
        <Card>
          <div className="p-5">
            <h3 className="text-sm font-bold text-graphite-700 dark:text-graphite-300 mb-4 uppercase tracking-wider">
              Activity (last 12 months)
            </h3>
            {totalJobs === 0 ? (
              <div className="py-12 text-center text-sm text-graphite-400 dark:text-graphite-500">
                No activity yet.
              </div>
            ) : (
              <ClientMonthlyChart data={chartData} />
            )}
          </div>
        </Card>

        {/* Recent jobs table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-graphite-700 dark:text-graphite-300 uppercase tracking-wider">
              Recent jobs {allJobs.length > 10 && <span className="text-graphite-400 normal-case font-normal">(showing 10 of {allJobs.length})</span>}
            </h3>
          </div>
          {recentJobs.length === 0 ? (
            <Card>
              <div className="p-8 text-center text-sm text-graphite-400 dark:text-graphite-500">
                No jobs for this client yet.{" "}
                <Link href="/jobs/new" className="text-cyan hover:underline">
                  Create one
                </Link>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-graphite-500 dark:text-graphite-400 border-b border-graphite-100 dark:border-graphite-800">
                      <th className="px-5 py-3 font-semibold">Address</th>
                      <th className="px-3 py-3 font-semibold">Date</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold text-right">Photos</th>
                      <th className="px-5 py-3 font-semibold text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-graphite-100 dark:divide-graphite-800">
                    {recentJobs.map((job) => (
                      <tr
                        key={job.id}
                        className="hover:bg-graphite-50 dark:hover:bg-graphite-800 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/jobs/${job.id}`}
                            className="font-semibold text-graphite-900 dark:text-white hover:text-cyan transition-colors"
                          >
                            {job.address}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-graphite-500 dark:text-graphite-400 whitespace-nowrap">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                              statusColors[job.status] || statusColors.pending
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-graphite-600 dark:text-graphite-300">
                          {job.totalPhotos}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-graphite-900 dark:text-white">
                          ${job.cost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
