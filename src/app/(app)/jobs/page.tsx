import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth";
import { NewJobTile } from "@/components/jobs/new-job-modal";
import { JobCard } from "@/components/jobs/job-card";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["pending", "processing", "review"];

export default async function JobsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isAdmin = session.user.role === "admin";
  const where = isAdmin ? {} : { photographerId: session.user.id };

  const [jobs, photoAgg, todayCount, activeCount] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { photos: true } },
        photographer: { select: { name: true, email: true } },
        // Just the IDs — the card component hits /api/jobs/:id/photos/:id/thumb
        // which 302-redirects to the Dropbox CDN for new photos. Data URLs
        // never cross the wire to the client.
        photos: {
          where: {
            OR: [
              { editedUrl: { not: null } },
              { thumbnailUrl: { not: null } },
              { originalUrl: { not: null } },
            ],
          },
          orderBy: { orderIndex: "asc" },
          take: 1,
          select: { id: true },
        },
      },
      take: 60,
    }),
    prisma.photo.count({
      where: { job: where },
    }),
    prisma.job.count({
      where: {
        ...where,
        createdAt: { gte: startOfTodayUtc() },
      },
    }),
    prisma.job.count({
      where: { ...where, status: { in: ACTIVE_STATUSES } },
    }),
  ]);

  const approvedCount = await prisma.photo.count({
    where: { job: where, status: "approved" },
  });

  const greeting = getGreeting();
  const displayName = session.user.name?.split(" ")[0] ?? null;

  return (
    <main className="min-h-screen bg-graphite-950 text-white">
      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-graphite-900 bg-graphite-950/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <Link href="/jobs" className="font-semibold text-[15px] tracking-tight">
            <span className="text-white">Batch</span>
            <span className="text-cyan">Base</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/jobs"
              className="px-3 h-8 flex items-center rounded-lg text-white font-medium bg-graphite-900"
            >
              Jobs
            </Link>
            {isAdmin && (
              <Link
                href="/users"
                className="px-3 h-8 flex items-center rounded-lg text-graphite-400 hover:text-white hover:bg-graphite-900"
              >
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
                className="px-3 h-8 flex items-center rounded-lg text-graphite-400 hover:text-red-300 hover:bg-red-950/20"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 pt-10 pb-16 space-y-8">
        {/* Hero line */}
        <section>
          <div className="text-[11px] uppercase tracking-[0.25em] text-graphite-500 mb-3">
            {greeting}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.02]">
            {displayName ? (
              <>
                <span className="text-white">Welcome back, </span>
                <span className="text-cyan">{displayName}</span>
                <span className="text-white">.</span>
              </>
            ) : (
              <span className="text-white">Your workbench.</span>
            )}
          </h1>
        </section>

        {/* Bento row 1 — stats + CTA */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatTile
            kicker="In pipeline"
            value={activeCount}
            hint={activeCount === 1 ? "job moving" : "jobs moving"}
            accent="cyan"
          />
          <StatTile
            kicker="Today"
            value={todayCount}
            hint={todayCount === 1 ? "new job" : "new jobs"}
            accent="amber"
          />
          <StatTile
            kicker="Photos delivered"
            value={approvedCount}
            hint={`of ${photoAgg} total`}
            accent="emerald"
          />
          <div className="sm:col-span-2 lg:col-span-1">
            <NewJobTile />
          </div>
        </section>

        {/* Bento row 2+ — jobs */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[11px] uppercase tracking-[0.25em] text-graphite-500">
              Recent jobs
            </h2>
            <span className="text-[11px] text-graphite-600 tabular-nums">
              {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
            </span>
          </div>

          {jobs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {jobs.map((job, idx) => {
                const coverPhotoId = job.photos[0]?.id;
                const cover = coverPhotoId
                  ? `/api/jobs/${job.id}/photos/${coverPhotoId}/thumb`
                  : null;
                // Featured every 7th tile — breaks grid rhythm into an editorial feel
                const featured = idx % 7 === 0 && jobs.length > 3;
                return (
                  <div key={job.id} className={featured ? "sm:col-span-2 lg:col-span-2" : ""}>
                    <JobCard
                      id={job.id}
                      address={job.address}
                      status={job.status}
                      photoCount={job._count.photos}
                      createdAt={job.createdAt}
                      coverUrl={cover}
                      size={featured ? "lg" : "md"}
                      photographerName={
                        isAdmin ? job.photographer?.name ?? job.photographer?.email ?? null : null
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatTile({
  kicker,
  value,
  hint,
  accent,
}: {
  kicker: string;
  value: number;
  hint: string;
  accent: "cyan" | "amber" | "emerald";
}) {
  const accentMap = {
    cyan: "text-cyan bg-[radial-gradient(circle_at_80%_20%,rgba(34,211,238,0.18),transparent_60%)]",
    amber: "text-amber-300 bg-[radial-gradient(circle_at_80%_20%,rgba(251,191,36,0.15),transparent_60%)]",
    emerald: "text-emerald-300 bg-[radial-gradient(circle_at_80%_20%,rgba(52,211,153,0.15),transparent_60%)]",
  } as const;
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-graphite-900 border border-graphite-800 p-5 min-h-[140px] flex flex-col justify-between ${accentMap[accent]}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-graphite-500">
        {kicker}
      </div>
      <div>
        <div className={`text-5xl font-semibold tracking-tight tabular-nums ${accentMap[accent].split(" ")[0]}`}>
          {value}
        </div>
        <div className="text-xs text-graphite-400 mt-1">{hint}</div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-graphite-800 bg-graphite-900/40 p-16 text-center">
      <div className="text-[11px] uppercase tracking-[0.25em] text-graphite-500 mb-3">
        No jobs yet
      </div>
      <p className="text-lg text-graphite-300">
        Hit <span className="text-cyan font-medium">Create a job</span> to get started.
      </p>
    </div>
  );
}

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Late night";
}
