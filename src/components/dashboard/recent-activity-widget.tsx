import { prisma } from "@/lib/db";
import Link from "next/link";

interface Props {
  userId: string;
  isAdmin: boolean;
}

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export async function RecentActivityWidget({ userId, isAdmin }: Props) {
  const where = isAdmin ? {} : { userId };
  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10,
  }).catch(() => []);

  return (
    <div className="bg-white dark:bg-graphite-900 rounded-lg border border-graphite-100 dark:border-graphite-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-graphite-50 dark:border-graphite-800">
        <h3 className="text-sm font-semibold text-graphite-900 dark:text-white">Recent activity</h3>
        <Link href="/activity" className="text-xs text-cyan hover:underline">
          View all →
        </Link>
      </div>
      {logs.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-graphite-400">
          No activity yet
        </div>
      ) : (
        <ul className="divide-y divide-graphite-50 dark:divide-graphite-800">
          {logs.map((log) => (
            <li key={log.id} className="px-4 py-2 text-xs flex items-start gap-2 hover:bg-graphite-50 dark:hover:bg-graphite-800 transition-colors">
              <span className="text-graphite-400 dark:text-graphite-500 w-8 flex-shrink-0 text-right">
                {formatTime(log.createdAt)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-graphite-700 dark:text-graphite-200 truncate font-medium">
                  {log.type}
                </div>
                {log.message && (
                  <div className="text-graphite-500 dark:text-graphite-400 text-[11px] truncate">
                    {log.message}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
