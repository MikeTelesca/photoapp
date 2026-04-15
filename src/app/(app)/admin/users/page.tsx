import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { RoleToggleButton } from "./_components/role-toggle-button";
import { ImpersonateButton } from "./_components/impersonate-button";
import { SeedDemoButton } from "@/components/admin/seed-demo-button";

export const metadata = {
  title: "User Management",
};

export default async function AdminUsersPage() {
  const auth = await requireAdmin();
  if ("error" in auth) redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { jobs: true } },
      jobs: { select: { cost: true, totalPhotos: true } },
    },
  });

  return (
    <>
      <Topbar title="User Management" subtitle="Manage user accounts and roles" />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-4 flex justify-end">
          <SeedDemoButton />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <div className="text-sm text-graphite-400 ml-auto">
              {users.length} user{users.length !== 1 ? "s" : ""}
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-graphite-400 border-b border-graphite-100 dark:border-graphite-800 bg-graphite-50 dark:bg-graphite-800/30">
                <tr>
                  <th className="text-left py-3 px-5 font-semibold">Name</th>
                  <th className="text-left py-3 px-5 font-semibold">Email</th>
                  <th className="text-left py-3 px-5 font-semibold">Role</th>
                  <th className="text-right py-3 px-5 font-semibold">Jobs</th>
                  <th className="text-right py-3 px-5 font-semibold">Photos</th>
                  <th className="text-right py-3 px-5 font-semibold">Total Cost</th>
                  <th className="text-right py-3 px-5 font-semibold">Joined</th>
                  <th className="text-center py-3 px-5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const totalCost = user.jobs.reduce((sum, j) => sum + j.cost, 0);
                  const totalPhotos = user.jobs.reduce((sum, j) => sum + j.totalPhotos, 0);
                  const isCurrentUser = user.id === auth.userId;

                  return (
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
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            user.role === "admin"
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                              : "bg-graphite-100 dark:bg-graphite-700 text-graphite-600 dark:text-graphite-300"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right text-graphite-600 dark:text-graphite-300">
                        {user._count.jobs}
                      </td>
                      <td className="py-3 px-5 text-right text-graphite-600 dark:text-graphite-300">
                        {totalPhotos}
                      </td>
                      <td className="py-3 px-5 text-right text-graphite-600 dark:text-graphite-300 font-medium">
                        ${totalCost.toFixed(2)}
                      </td>
                      <td className="py-3 px-5 text-right text-xs text-graphite-400">
                        {user.createdAt.toLocaleDateString()}
                      </td>
                      <td className="py-3 px-5 text-center">
                        {!isCurrentUser && (
                          <div className="flex flex-col items-center gap-1">
                            <RoleToggleButton
                              userId={user.id}
                              currentRole={user.role}
                              userName={user.name || user.email}
                            />
                            <ImpersonateButton
                              userId={user.id}
                              userName={user.name || user.email || user.id}
                            />
                          </div>
                        )}
                        {isCurrentUser && (
                          <span className="text-xs text-graphite-400">You</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
