import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AppNav } from "@/components/layout/app-nav";
import { AgentsManager } from "@/components/agents/agents-manager";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isAdmin = session.user.role === "admin";
  const where = isAdmin ? {} : { photographerId: session.user.id };

  const agents = await prisma.agent.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { jobs: true } } },
  });

  const totalJobs = agents.reduce((sum, a) => sum + a._count.jobs, 0);
  const withFolder = agents.filter((a) => !!a.dropboxFolder).length;

  return (
    <main className="min-h-screen bg-graphite-950 text-white">
      <AppNav active="agents" isAdmin={isAdmin} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 pt-10 pb-16 space-y-8">
        <section>
          <div className="text-[11px] uppercase tracking-[0.25em] text-graphite-500 mb-3">
            Your roster
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.02]">
            <span className="text-white">Agents</span>
            <span className="text-cyan">.</span>
          </h1>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatTile
            kicker="Roster"
            value={agents.length}
            hint={agents.length === 1 ? "agent" : "agents"}
          />
          <StatTile
            kicker="Jobs linked"
            value={totalJobs}
            hint={totalJobs === 1 ? "job" : "jobs"}
          />
          <StatTile
            kicker="Dropbox folders"
            value={withFolder}
            hint="auto-created"
          />
        </section>

        <AgentsManager
          initialAgents={agents.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            phone: a.phone,
            notes: a.notes,
            dropboxFolder: a.dropboxFolder,
            dropboxShareUrl: a.dropboxShareUrl,
            jobCount: a._count.jobs,
          }))}
        />
      </div>
    </main>
  );
}

function StatTile({ kicker, value, hint }: { kicker: string; value: number; hint: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-graphite-900 border border-graphite-800 p-5 min-h-[120px] flex flex-col justify-between">
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-graphite-500">
        {kicker}
      </div>
      <div>
        <div className="text-4xl font-semibold tracking-tight tabular-nums text-cyan">{value}</div>
        <div className="text-xs text-graphite-400 mt-1">{hint}</div>
      </div>
    </div>
  );
}
