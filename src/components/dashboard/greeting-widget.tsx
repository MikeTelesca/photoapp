import { prisma } from "@/lib/db";

interface Props {
  userId: string;
  userName: string | null;
}

export async function GreetingWidget({ userId, userName }: Props) {
  const now = new Date();
  const hour = now.getHours();
  let greeting = "Hello";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";
  else if (hour < 22) greeting = "Good evening";
  else greeting = "Working late";

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [reviewCount, todayJobs, monthSpend] = await Promise.all([
    prisma.job
      .count({
        where: {
          photographerId: userId,
          status: "review",
          archivedAt: null,
        },
      })
      .catch(() => 0),
    prisma.job
      .count({
        where: {
          photographerId: userId,
          createdAt: { gte: startOfDay },
        },
      })
      .catch(() => 0),
    prisma.job
      .aggregate({
        where: {
          photographerId: userId,
          createdAt: { gte: startOfMonth },
        },
        _sum: { cost: true },
      })
      .then((r) => r._sum.cost || 0)
      .catch(() => 0),
  ]);

  const firstName = (userName || "").split(" ")[0] || userName || "there";

  return (
    <div className="mb-4">
      <h1 className="text-xl font-semibold text-graphite-900 dark:text-white">
        {greeting}, {firstName}
      </h1>
      <div className="text-sm text-graphite-500 dark:text-graphite-400 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
        {reviewCount > 0 && (
          <span className="text-cyan font-semibold">
            📥 {reviewCount} job{reviewCount === 1 ? "" : "s"} awaiting review
          </span>
        )}
        {todayJobs > 0 && (
          <span>🆕 {todayJobs} new job{todayJobs === 1 ? "" : "s"} today</span>
        )}
        {monthSpend > 0 && (
          <span>💳 ${monthSpend.toFixed(2)} this month</span>
        )}
        {reviewCount === 0 && todayJobs === 0 && (
          <span>You're all caught up.</span>
        )}
      </div>
    </div>
  );
}
