import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { SignupsChart } from "@/components/admin/signups-chart";

export const metadata = {
  title: "System Stats",
};

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <div className="p-5">
        <div className="text-xs uppercase tracking-wide text-graphite-400 font-semibold">
          {label}
        </div>
        <div className="mt-2 text-2xl font-bold text-graphite-900 dark:text-white">
          {value}
        </div>
        {hint && (
          <div className="mt-1 text-xs text-graphite-400">{hint}</div>
        )}
      </div>
    </Card>
  );
}

export default async function AdminStatsPage() {
  const auth = await requireAdmin();
  if ("error" in auth) redirect("/");

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUserIds,
    totalJobsAll,
    totalJobs7d,
    totalJobs30d,
    totalPhotos,
    costAgg,
    storageAgg,
    signups30d,
    topUsersRaw,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.loginRecord.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.job.count(),
    prisma.job.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.job.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.photo.count(),
    prisma.job.aggregate({ _sum: { cost: true } }),
    prisma.photo.aggregate({ _sum: { fileSizeBytes: true } }),
    prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.job.groupBy({
      by: ["photographerId"],
      _sum: { totalPhotos: true, cost: true },
      _count: { _all: true },
      orderBy: { _sum: { totalPhotos: "desc" } },
      take: 10,
    }),
  ]);

  const activeUsers = activeUserIds.length;
  const totalSpend = costAgg._sum.cost ?? 0;
  const totalStorageBytes = storageAgg._sum.fileSizeBytes ?? 0;

  // Build 30-day signups chart (fill zero days)
  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, 0);
  }
  for (const u of signups30d) {
    const key = u.createdAt.toISOString().slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const signupsChartData = Array.from(byDay.entries()).map(([date, signups]) => ({
    date: date.slice(5), // MM-DD
    signups,
  }));

  // Resolve top users' names
  const topUserIds = topUsersRaw.map((r) => r.photographerId);
  const topUserRecords = await prisma.user.findMany({
    where: { id: { in: topUserIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(topUserRecords.map((u) => [u.id, u]));
  const topUsers = topUsersRaw.map((r) => ({
    userId: r.photographerId,
    name: userMap.get(r.photographerId)?.name ?? "—",
    email: userMap.get(r.photographerId)?.email ?? "—",
    photos: r._sum.totalPhotos ?? 0,
    jobs: r._count._all,
    cost: r._sum.cost ?? 0,
  }));

  return (
    <>
      <Topbar title="System Stats" subtitle="Platform-wide metrics and usage overview" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={totalUsers.toLocaleString()} />
          <StatCard
            label="Active (30d)"
            value={activeUsers.toLocaleString()}
            hint="Logged in last 30 days"
          />
          <StatCard label="Total Jobs" value={totalJobsAll.toLocaleString()} />
          <StatCard label="Jobs (7d)" value={totalJobs7d.toLocaleString()} />
          <StatCard label="Jobs (30d)" value={totalJobs30d.toLocaleString()} />
          <StatCard
            label="Photos Processed"
            value={totalPhotos.toLocaleString()}
            hint="All-time"
          />
          <StatCard
            label="Total API Spend"
            value={`$${totalSpend.toFixed(2)}`}
            hint="Sum of Job.cost"
          />
          <StatCard
            label="Storage"
            value={totalStorageBytes > 0 ? formatBytes(totalStorageBytes) : "—"}
            hint={totalStorageBytes > 0 ? "Sum of Photo.fileSizeBytes" : "Not tracked"}
          />
        </div>

        {/* Signups chart */}
        <Card>
          <CardHeader>
            <CardTitle>Signups — last 30 days</CardTitle>
          </CardHeader>
          <div className="p-5 pt-0">
            <SignupsChart data={signupsChartData} />
          </div>
        </Card>

        {/* Top users table */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Users by Photos Processed</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-graphite-400 border-b border-graphite-100 dark:border-graphite-800 bg-graphite-50 dark:bg-graphite-800/30">
                <tr>
                  <th className="text-left py-3 px-5 font-semibold">#</th>
                  <th className="text-left py-3 px-5 font-semibold">Name</th>
                  <th className="text-left py-3 px-5 font-semibold">Email</th>
                  <th className="text-right py-3 px-5 font-semibold">Photos</th>
                  <th className="text-right py-3 px-5 font-semibold">Jobs</th>
                  <th className="text-right py-3 px-5 font-semibold">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-graphite-400">
                      No users with jobs yet.
                    </td>
                  </tr>
                )}
                {topUsers.map((u, idx) => (
                  <tr
                    key={u.userId}
                    className="border-b border-graphite-50 dark:border-graphite-800 bg-white dark:bg-graphite-900 hover:bg-graphite-50 dark:hover:bg-graphite-800/40 transition-colors"
                  >
                    <td className="py-3 px-5 text-graphite-400">{idx + 1}</td>
                    <td className="py-3 px-5 font-medium text-graphite-900 dark:text-white">
                      {u.name}
                    </td>
                    <td className="py-3 px-5 text-graphite-600 dark:text-graphite-300">
                      {u.email}
                    </td>
                    <td className="py-3 px-5 text-right text-graphite-600 dark:text-graphite-300">
                      {u.photos.toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-right text-graphite-600 dark:text-graphite-300">
                      {u.jobs.toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-right font-medium text-graphite-600 dark:text-graphite-300">
                      ${u.cost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
