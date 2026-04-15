import { prisma } from "@/lib/db";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/dashboard");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

  const [
    totalJobs,
    monthJobs,
    weekJobs,
    totalPhotos,
    monthPhotos,
    monthCostAgg,
    photographers,
    topPhotographers,
  ] = await Promise.all([
    prisma.job.count({ where: { status: { not: "deleted" } } }),
    prisma.job.count({ where: { status: { not: "deleted" }, createdAt: { gte: startOfMonth } } }),
    prisma.job.count({ where: { status: { not: "deleted" }, createdAt: { gte: startOfWeek } } }),
    prisma.photo.count(),
    prisma.photo.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.job.aggregate({ _sum: { cost: true }, where: { createdAt: { gte: startOfMonth } } }),
    prisma.user.count({ where: { role: "photographer" } }),
    prisma.job.groupBy({
      by: ["photographerId"],
      _count: true,
      _sum: { cost: true },
      where: { createdAt: { gte: startOfMonth }, status: { not: "deleted" } },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  const photographerNames = await prisma.user.findMany({
    where: { id: { in: topPhotographers.map((p) => p.photographerId) } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(photographerNames.map((u) => [u.id, u.name]));

  const monthCost = monthCostAgg._sum.cost || 0;

  return (
    <>
      <Topbar title="Analytics" subtitle="Usage and performance metrics" />
      <div className="p-6 space-y-4 max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-5">
              <div className="text-xs font-semibold text-graphite-400 uppercase">Total Jobs</div>
              <div className="text-3xl font-extrabold text-graphite-900 mt-1">{totalJobs}</div>
              <div className="text-xs text-graphite-400 mt-1">{monthJobs} this month</div>
            </div>
          </Card>
          <Card>
            <div className="p-5">
              <div className="text-xs font-semibold text-graphite-400 uppercase">Jobs This Week</div>
              <div className="text-3xl font-extrabold text-graphite-900 mt-1">{weekJobs}</div>
            </div>
          </Card>
          <Card>
            <div className="p-5">
              <div className="text-xs font-semibold text-graphite-400 uppercase">Photos Processed</div>
              <div className="text-3xl font-extrabold text-graphite-900 mt-1">{totalPhotos}</div>
              <div className="text-xs text-graphite-400 mt-1">{monthPhotos} this month</div>
            </div>
          </Card>
          <Card>
            <div className="p-5">
              <div className="text-xs font-semibold text-graphite-400 uppercase">Cost This Month</div>
              <div className="text-3xl font-extrabold text-graphite-900 mt-1">${monthCost.toFixed(2)}</div>
              <div className="text-xs text-graphite-400 mt-1">{photographers} photographers</div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Photographers This Month</CardTitle>
          </CardHeader>
          <div className="p-5">
            {topPhotographers.length === 0 ? (
              <div className="text-sm text-graphite-400 text-center py-4">No jobs this month yet</div>
            ) : (
              <div className="space-y-2">
                {topPhotographers.map((p) => (
                  <div key={p.photographerId} className="flex items-center justify-between py-2 border-b border-graphite-50 last:border-b-0">
                    <span className="text-sm font-semibold text-graphite-900">{nameMap.get(p.photographerId) || "Unknown"}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-graphite-500">{p._count} jobs</span>
                      <span className="text-xs text-graphite-700 font-semibold">${(p._sum.cost || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
