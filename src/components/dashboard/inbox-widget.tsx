import { prisma } from "@/lib/db";
import Link from "next/link";

interface Props {
  userId: string;
}

export async function InboxWidget({ userId }: Props) {
  const reviewJobs = await prisma.job.findMany({
    where: {
      photographerId: userId,
      status: "review",
      archivedAt: null,
    },
    select: {
      id: true,
      address: true,
      totalPhotos: true,
      approvedPhotos: true,
      rejectedPhotos: true,
      createdAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  }).catch(() => []);

  if (reviewJobs.length === 0) return null;

  return (
    <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">
            📥 Inbox · {reviewJobs.length} job{reviewJobs.length === 1 ? "" : "s"} waiting for review
          </h3>
          <p className="text-xs text-cyan-700 dark:text-cyan-300 mt-0.5">
            Approve or reject the photos below to finalize.
          </p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {reviewJobs.map(j => {
          const pending = j.totalPhotos - j.approvedPhotos - j.rejectedPhotos;
          return (
            <li key={j.id}>
              <Link href={`/review/${j.id}`}
                className="flex items-center justify-between bg-white dark:bg-graphite-900 hover:bg-graphite-50 dark:hover:bg-graphite-800 rounded px-3 py-2 text-sm">
                <div>
                  <div className="font-medium dark:text-white">{j.address}</div>
                  <div className="text-xs text-graphite-500 dark:text-graphite-400">
                    {pending} pending · {j.approvedPhotos} approved · {j.rejectedPhotos} rejected
                  </div>
                </div>
                <span className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">Review →</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
