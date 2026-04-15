import { prisma } from "@/lib/db";

interface Props {
  userId: string;
}

export async function StatsCards({ userId }: Props) {
  const now = new Date();

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [today, week, month] = await Promise.all([
    prisma.job.aggregate({
      where: { photographerId: userId, createdAt: { gte: startOfDay } },
      _count: { _all: true },
      _sum: { totalPhotos: true, cost: true },
    }).catch(() => null),
    prisma.job.aggregate({
      where: { photographerId: userId, createdAt: { gte: startOfWeek } },
      _count: { _all: true },
      _sum: { totalPhotos: true, cost: true },
    }).catch(() => null),
    prisma.job.aggregate({
      where: { photographerId: userId, createdAt: { gte: startOfMonth } },
      _count: { _all: true },
      _sum: { totalPhotos: true, cost: true },
    }).catch(() => null),
  ]);

  const stats = [
    {
      label: "Today",
      jobs: today?._count?._all || 0,
      photos: today?._sum?.totalPhotos || 0,
      cost: today?._sum?.cost || 0,
      color: "cyan",
    },
    {
      label: "This week",
      jobs: week?._count?._all || 0,
      photos: week?._sum?.totalPhotos || 0,
      cost: week?._sum?.cost || 0,
      color: "purple",
    },
    {
      label: "This month",
      jobs: month?._count?._all || 0,
      photos: month?._sum?.totalPhotos || 0,
      cost: month?._sum?.cost || 0,
      color: "emerald",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      {stats.map(s => (
        <div key={s.label} className="bg-white dark:bg-graphite-900 rounded-lg border border-graphite-100 dark:border-graphite-800 p-3">
          <div className="text-[10px] uppercase tracking-wide font-semibold text-graphite-500 dark:text-graphite-400">{s.label}</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-graphite-900 dark:text-white">{s.jobs}</span>
            <span className="text-[11px] text-graphite-400">{s.jobs === 1 ? "job" : "jobs"}</span>
          </div>
          <div className="flex justify-between items-baseline text-[11px] text-graphite-500 dark:text-graphite-400 mt-1">
            <span>📷 {s.photos} photos</span>
            <span>${s.cost.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
