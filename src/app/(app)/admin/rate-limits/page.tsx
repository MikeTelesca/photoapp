import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { TierSelect } from "./_components/tier-select";

export const metadata = {
  title: "Rate Limit Overrides",
};

export default async function AdminRateLimitsPage() {
  const auth = await requireAdmin();
  if ("error" in auth) redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      rateLimitTier: true,
      createdAt: true,
    },
  });

  return (
    <>
      <Topbar title="Rate Limit Overrides" subtitle="Per-user tier caps for API rate limits" />
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Tiers</CardTitle>
            <div className="text-sm text-graphite-400 ml-auto">
              {users.length} user{users.length !== 1 ? "s" : ""}
            </div>
          </CardHeader>
          <div className="px-5 pb-3 text-xs text-graphite-500 dark:text-graphite-400">
            <span className="font-semibold">standard</span>: default caps ·{" "}
            <span className="font-semibold">pro</span>: 2&times; default ·{" "}
            <span className="font-semibold">unlimited</span>: no rate limiting ·{" "}
            <span className="font-semibold">banned</span>: always rejected (429)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-graphite-400 border-b border-graphite-100 dark:border-graphite-800 bg-graphite-50 dark:bg-graphite-800/30">
                <tr>
                  <th className="text-left py-3 px-5 font-semibold">Name</th>
                  <th className="text-left py-3 px-5 font-semibold">Email</th>
                  <th className="text-left py-3 px-5 font-semibold">Role</th>
                  <th className="text-left py-3 px-5 font-semibold">Tier</th>
                  <th className="text-right py-3 px-5 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-graphite-50 dark:border-graphite-800 bg-white dark:bg-graphite-900 hover:bg-graphite-50 dark:hover:bg-graphite-800/40 transition-colors"
                  >
                    <td className="py-3 px-5 font-medium text-graphite-900 dark:text-white">
                      {user.name || "—"}
                    </td>
                    <td className="py-3 px-5 text-graphite-600 dark:text-graphite-300">
                      {user.email}
                    </td>
                    <td className="py-3 px-5">
                      <span className="text-xs text-graphite-500 dark:text-graphite-400">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <TierSelect userId={user.id} currentTier={user.rateLimitTier} />
                    </td>
                    <td className="py-3 px-5 text-right text-xs text-graphite-400">
                      {user.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
