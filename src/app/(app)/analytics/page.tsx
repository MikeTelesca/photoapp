import { prisma } from "@/lib/db";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DailyChart } from "@/components/analytics/daily-chart";
import { PhotographerCostChart } from "@/components/analytics/photographer-cost-chart";
import { forecastCost } from "@/lib/forecast";
import { ForecastChart } from "@/components/analytics/forecast-chart";
import { CompletionTimeChart } from "@/components/analytics/completion-time-chart";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/dashboard");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalJobs,
    monthJobs,
    weekJobs,
    totalPhotos,
    monthPhotos,
    monthCostAgg,
    photographers,
    topPhotographers,
    jobs30d,
    photographerStats,
    topClients,
  ] = await Promise.all([
    prisma.job.count({ where: { status: { not: "deleted" } } }),
    prisma.job.count({
      where: { status: { not: "deleted" }, createdAt: { gte: startOfMonth } },
    }),
    prisma.job.count({
      where: { status: { not: "deleted" }, createdAt: { gte: startOfWeek } },
    }),
    prisma.photo.count(),
    prisma.photo.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.job.aggregate({
      _sum: { cost: true },
      where: { createdAt: { gte: startOfMonth } },
    }),
    prisma.user.count({ where: { role: "photographer" } }),
    prisma.job.groupBy({
      by: ["photographerId"],
      _count: true,
      _sum: { cost: true },
      where: { createdAt: { gte: startOfMonth }, status: { not: "deleted" } },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    prisma.job.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, status: { not: "deleted" } },
      select: { createdAt: true, cost: true },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        jobs: {
          where: { createdAt: { gte: startOfMonth } },
          select: { totalPhotos: true, approvedPhotos: true, cost: true, status: true },
        },
      },
    }),
    prisma.client.findMany({
      where: { ownerId: session?.user?.id || "" },
      include: {
        jobs: {
          select: { cost: true, totalPhotos: true, createdAt: true },
        },
      },
    }).catch(() => []),
  ]);

  // Fetch recent jobs that reached review status for completion time chart
  const recentReviewJobs = await prisma.job.findMany({
    where: {
      status: { in: ["review", "approved"] },
      archivedAt: null,
    },
    select: {
      id: true,
      address: true,
      createdAt: true,
      updatedAt: true,
      totalPhotos: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  const completionTimes = recentReviewJobs
    .map(j => ({
      address: j.address,
      minutes: Math.round((j.updatedAt.getTime() - j.createdAt.getTime()) / 60000),
      photos: j.totalPhotos,
      perPhoto: j.totalPhotos > 0 ? Math.round((j.updatedAt.getTime() - j.createdAt.getTime()) / 1000 / j.totalPhotos) : 0,
    }))
    .filter(t => t.minutes > 0 && t.minutes < 24 * 60); // sanity bound

  // Median per-photo seconds
  const sortedPerPhoto = [...completionTimes].sort((a, b) => a.perPhoto - b.perPhoto);
  const medianPerPhoto = sortedPerPhoto.length > 0
    ? sortedPerPhoto[Math.floor(sortedPerPhoto.length / 2)].perPhoto
    : 0;

  const photographerNames = await prisma.user.findMany({
    where: { id: { in: topPhotographers.map((p) => p.photographerId) } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(photographerNames.map((u) => [u.id, u.name]));

  const monthCost = monthCostAgg._sum.cost || 0;

  // Group jobs by day for last 30 days
  const dailyData: Array<{ date: string; jobs: number; cost: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);

    const dayJobs = jobs30d.filter((j) => j.createdAt >= d && j.createdAt < next);
    dailyData.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      jobs: dayJobs.length,
      cost: dayJobs.reduce((sum, j) => sum + j.cost, 0),
    });
  }

  // Build photographer cost data for bar chart
  const photographerCostData = topPhotographers.map((p) => ({
    name: nameMap.get(p.photographerId) ?? "Unknown",
    cost: p._sum.cost ?? 0,
    jobs: p._count,
  }));

  // Build history with actual costs per day
  const historyMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    historyMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const j of jobs30d) {
    const key = j.createdAt.toISOString().slice(0, 10);
    historyMap.set(key, (historyMap.get(key) || 0) + j.cost);
  }
  const history = Array.from(historyMap.entries()).map(([date, cost]) => ({
    date,
    cost,
  }));
  const forecast = forecastCost(history, 30);

  // Merge history + forecast for chart
  const chartData = [
    ...history.map((h) => ({ date: h.date, cost: h.cost })),
    ...forecast.map((f) => ({ date: f.date, projected: f.cost })),
  ];

  const projectedTotal = forecast.reduce((s, f) => s + f.cost, 0);

  // Compute client stats
  const clientStats = topClients
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      company: c.company,
      jobCount: c.jobs.length,
      totalPhotos: c.jobs.reduce((s: number, j: any) => s + (j.totalPhotos || 0), 0),
      totalSpend: c.jobs.reduce((s: number, j: any) => s + (j.cost || 0), 0),
      lastJob: c.jobs.length > 0 ? c.jobs.reduce((latest: Date, j: any) =>
        new Date(j.createdAt) > latest ? new Date(j.createdAt) : latest,
        new Date(0)
      ) : null,
    }))
    .filter(c => c.jobCount > 0)
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 5);

  // Compute photographer leaderboard
  const leaderboard = photographerStats
    .map((u) => ({
      id: u.id,
      name: u.name || u.email,
      jobCount: u.jobs.length,
      photoCount: u.jobs.reduce((s, j) => s + j.totalPhotos, 0),
      approvedCount: u.jobs.reduce((s, j) => s + j.approvedPhotos, 0),
      totalCost: u.jobs.reduce((s, j) => s + j.cost, 0),
      completedJobs: u.jobs.filter((j) => j.status === "approved").length,
    }))
    .filter((s) => s.jobCount > 0)
    .sort((a, b) => b.photoCount - a.photoCount)
    .slice(0, 10);

  return (
    <>
      <Topbar title="Analytics" subtitle="Usage and performance metrics" />
      <div className="p-6 space-y-4 max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-5">
              <div className="text-xs font-semibold text-graphite-400 uppercase">
                Total Jobs
              </div>
              <div className="text-3xl font-extrabold text-graphite-900 mt-1">
                {totalJobs}
              </div>
              <div className="text-xs text-graphite-400 mt-1">
                {monthJobs} this month
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-5">
              <div className="text-xs font-semibold text-graphite-400 uppercase">
                Jobs This Week
              </div>
              <div className="text-3xl font-extrabold text-graphite-900 mt-1">
                {weekJobs}
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-5">
              <div className="text-xs font-semibold text-graphite-400 uppercase">
                Photos Processed
              </div>
              <div className="text-3xl font-extrabold text-graphite-900 mt-1">
                {totalPhotos}
              </div>
              <div className="text-xs text-graphite-400 mt-1">
                {monthPhotos} this month
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-5">
              <div className="text-xs font-semibold text-graphite-400 uppercase">
                Cost This Month
              </div>
              <div className="text-3xl font-extrabold text-graphite-900 mt-1">
                ${monthCost.toFixed(2)}
              </div>
              <div className="text-xs text-graphite-400 mt-1">
                {photographers} photographers
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Jobs - Last 30 Days</CardTitle>
          </CardHeader>
          <div className="p-5">
            <DailyChart data={dailyData} />
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-sm font-semibold dark:text-white">
                  30-day spend forecast
                </h2>
                <div className="text-xs text-graphite-500 dark:text-graphite-400">
                  Linear projection from last 30 days · Projected next 30 days: $
                  {projectedTotal.toFixed(2)}
                </div>
              </div>
            </div>
            <ForecastChart data={chartData} />
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-sm font-semibold dark:text-white">Time to completion</h2>
                <div className="text-xs text-graphite-500 dark:text-graphite-400">
                  Per-photo enhance time on last {completionTimes.length} jobs · Median: <strong className="text-cyan">{medianPerPhoto}s</strong>
                </div>
              </div>
            </div>
            {completionTimes.length === 0 ? (
              <div className="text-center py-8 text-sm text-graphite-400">Need at least one completed job</div>
            ) : (
              <CompletionTimeChart data={completionTimes} median={medianPerPhoto} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend by Photographer (This Month)</CardTitle>
          </CardHeader>
          <div className="p-5">
            <PhotographerCostChart data={photographerCostData} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Photographers This Month</CardTitle>
          </CardHeader>
          <div className="p-5">
            {topPhotographers.length === 0 ? (
              <div className="text-sm text-graphite-400 text-center py-4">
                No jobs this month yet
              </div>
            ) : (
              <div className="space-y-2">
                {topPhotographers.map((p) => (
                  <div
                    key={p.photographerId}
                    className="flex items-center justify-between py-2 border-b border-graphite-50 last:border-b-0"
                  >
                    <span className="text-sm font-semibold text-graphite-900">
                      {nameMap.get(p.photographerId) ?? "Unknown"}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-graphite-500">
                        {p._count} jobs
                      </span>
                      <span className="text-xs text-graphite-700 font-semibold">
                        ${(p._sum.cost ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-3 dark:text-white">
              Leaderboard — This month
            </h2>
            {leaderboard.length === 0 ? (
              <div className="text-center py-8 text-sm text-graphite-400">No data yet this month</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-graphite-400 border-b border-graphite-100 dark:border-graphite-800">
                  <tr>
                    <th className="text-left py-2">#</th>
                    <th className="text-left">Photographer</th>
                    <th className="text-right">Jobs</th>
                    <th className="text-right">Photos</th>
                    <th className="text-right">Approved</th>
                    <th className="text-right">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, i) => (
                    <tr key={row.id} className="border-b border-graphite-50 dark:border-graphite-800">
                      <td className="py-2 w-8">
                        {i === 0 && <span className="text-amber-500">🥇</span>}
                        {i === 1 && <span className="text-graphite-400">🥈</span>}
                        {i === 2 && <span className="text-amber-700">🥉</span>}
                        {i >= 3 && <span className="text-graphite-400">{i + 1}</span>}
                      </td>
                      <td className="font-medium dark:text-white">{row.name}</td>
                      <td className="text-right">{row.jobCount}</td>
                      <td className="text-right">{row.photoCount}</td>
                      <td className="text-right text-emerald-600 dark:text-emerald-400">{row.approvedCount}</td>
                      <td className="text-right font-semibold">${row.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold dark:text-white">Top clients</h2>
              <Link href="/clients" className="text-xs text-cyan hover:underline">Manage →</Link>
            </div>
            {clientStats.length === 0 ? (
              <div className="text-center py-8 text-xs text-graphite-400">
                No client data yet. <Link href="/clients" className="text-cyan hover:underline">Add clients</Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-graphite-400 border-b border-graphite-100 dark:border-graphite-800">
                  <tr>
                    <th className="text-left py-2">Client</th>
                    <th className="text-right">Jobs</th>
                    <th className="text-right">Photos</th>
                    <th className="text-right">Spend</th>
                    <th className="text-right">Last job</th>
                  </tr>
                </thead>
                <tbody>
                  {clientStats.map((c: any) => (
                    <tr key={c.id} className="border-b border-graphite-50 dark:border-graphite-800 last:border-b-0">
                      <td className="py-2">
                        <Link href={`/clients/${c.id}`} className="font-medium text-cyan hover:underline">{c.name}</Link>
                        {c.company && <div className="text-[11px] text-graphite-400">{c.company}</div>}
                      </td>
                      <td className="text-right">{c.jobCount}</td>
                      <td className="text-right">{c.totalPhotos}</td>
                      <td className="text-right font-semibold dark:text-white">${c.totalSpend.toFixed(2)}</td>
                      <td className="text-right text-xs text-graphite-400">
                        {c.lastJob ? c.lastJob.toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
