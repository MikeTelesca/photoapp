import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth";
import { NewJobForm } from "@/components/jobs/new-job-form";

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export default async function JobsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isAdmin = session.user.role === "admin";
  const where = isAdmin ? {} : { photographerId: session.user.id };

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { photos: true } },
      photographer: { select: { name: true, email: true } },
    },
    take: 100,
  });

  return (
    <main className="min-h-screen bg-graphite-50 dark:bg-graphite-950 text-graphite-900 dark:text-white">
      <header className="sticky top-0 z-10 border-b border-graphite-200 dark:border-graphite-800 bg-white/90 dark:bg-graphite-950/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/jobs" className="font-semibold text-lg tracking-tight">
            <span className="text-graphite-900 dark:text-white">Batch</span>
            <span className="text-cyan">Base</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/jobs" className="text-graphite-900 dark:text-white font-medium">
              Jobs
            </Link>
            {isAdmin && (
              <Link href="/users" className="text-graphite-500 hover:text-graphite-900 dark:hover:text-white">
                Users
              </Link>
            )}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-graphite-500 hover:text-red-600 dark:hover:text-red-400"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-500 mb-3">
            New job
          </h2>
          <NewJobForm />
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-500 mb-3">
            Jobs ({jobs.length})
          </h2>
          {jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-graphite-200 dark:border-graphite-800 p-12 text-center text-graphite-500">
              No jobs yet. Create your first one above.
            </div>
          ) : (
            <div className="rounded-lg border border-graphite-200 dark:border-graphite-800 overflow-hidden bg-white dark:bg-graphite-900">
              <table className="w-full text-sm">
                <thead className="bg-graphite-50 dark:bg-graphite-950 text-xs uppercase tracking-wide text-graphite-500">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Address</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Photos</th>
                    {isAdmin && <th className="text-left px-4 py-3 font-medium">Shooter</th>}
                    <th className="text-left px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-t border-graphite-100 dark:border-graphite-800 hover:bg-graphite-50 dark:hover:bg-graphite-950/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/job/${job.id}`}
                          className="font-medium text-graphite-900 dark:text-white hover:text-cyan"
                        >
                          {job.address}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3 text-graphite-600 dark:text-graphite-300">
                        {job._count.photos}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-graphite-600 dark:text-graphite-300">
                          {job.photographer?.name || job.photographer?.email || "—"}
                        </td>
                      )}
                      <td className="px-4 py-3 text-graphite-500">
                        {formatDate(job.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-graphite-100 text-graphite-700 dark:bg-graphite-800 dark:text-graphite-200",
    processing: "bg-cyan/10 text-cyan",
    review: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  };
  const cls = colors[status] ?? colors.pending;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
