import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ArchivedJobsPage() {
  const auth = await requireUser();
  if ("error" in auth) redirect("/login");

  const jobs = await prisma.job.findMany({
    where: {
      photographerId: auth.userId,
      archivedAt: { not: null },
    },
    orderBy: { archivedAt: "desc" },
  }).catch(() => []);

  return (
    <>
      <Topbar title="Archived jobs" />
      <div className="p-6">
        <Card>
          <div className="p-4">
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-sm text-graphite-400">No archived jobs</div>
            ) : (
              <ul className="divide-y divide-graphite-100 dark:divide-graphite-800">
                {jobs.map((j: any) => (
                  <li key={j.id} className="flex justify-between items-center py-2">
                    <Link href={`/review/${j.id}`} className="flex-1">
                      <div className="text-sm font-medium dark:text-white">{j.address}</div>
                      <div className="text-xs text-graphite-400">
                        {j.status} · {j.totalPhotos} photos · archived {new Date(j.archivedAt).toLocaleDateString()}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
