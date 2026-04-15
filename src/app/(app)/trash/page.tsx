import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { TrashRowActions } from "./row-actions";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const auth = await requireUser();
  if ("error" in auth) redirect("/login");

  const roleFilter =
    auth.role === "admin" ? {} : { photographerId: auth.userId };

  const jobs = await prisma.job
    .findMany({
      where: {
        ...roleFilter,
        deletedAt: { not: null },
      },
      orderBy: { deletedAt: "desc" },
    })
    .catch(() => [] as any[]);

  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  return (
    <>
      <Topbar title="Trash" />
      <div className="p-6">
        <Card>
          <div className="p-4">
            <div className="mb-4 text-xs text-graphite-500 dark:text-graphite-400">
              Deleted jobs are kept here for 30 days, then permanently removed.
              You can restore a job at any time before it is purged.
            </div>
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-sm text-graphite-400">
                Trash is empty
              </div>
            ) : (
              <ul className="divide-y divide-graphite-100 dark:divide-graphite-800">
                {jobs.map((j: any) => {
                  const deletedAt = new Date(j.deletedAt);
                  const purgeAt = new Date(deletedAt.getTime() + THIRTY_DAYS_MS);
                  const daysLeft = Math.max(
                    0,
                    Math.ceil((purgeAt.getTime() - now) / (24 * 60 * 60 * 1000))
                  );
                  return (
                    <li
                      key={j.id}
                      className="flex items-center justify-between py-3 gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium dark:text-white truncate">
                          {j.address}
                        </div>
                        <div className="text-xs text-graphite-400">
                          {j.totalPhotos} photos · deleted{" "}
                          {deletedAt.toLocaleDateString()} · purges in{" "}
                          {daysLeft} {daysLeft === 1 ? "day" : "days"}
                        </div>
                      </div>
                      <TrashRowActions jobId={j.id} address={j.address} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
