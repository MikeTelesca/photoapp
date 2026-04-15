import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { SeedDemoButton } from "@/components/admin/seed-demo-button";
import { UsersTable, type AdminUserRow } from "./_components/users-table";

export const metadata = {
  title: "User Management",
};

export default async function AdminUsersPage() {
  const auth = await requireAdmin();
  if ("error" in auth) redirect("/");

  const usersRaw = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { jobs: true } },
      jobs: { select: { cost: true, totalPhotos: true } },
      loginRecords: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  // Compute referral counts (number of users whose referredByUserId === this user id)
  const referralGroups = await prisma.user.groupBy({
    by: ["referredByUserId"],
    _count: { _all: true },
    where: { referredByUserId: { not: null } },
  });
  const referralCountMap = new Map<string, number>();
  for (const g of referralGroups) {
    if (g.referredByUserId) referralCountMap.set(g.referredByUserId, g._count._all);
  }

  const users: AdminUserRow[] = usersRaw.map((u) => {
    const totalCost = u.jobs.reduce((sum, j) => sum + j.cost, 0);
    const totalPhotos = u.jobs.reduce((sum, j) => sum + j.totalPhotos, 0);
    const lastLogin = u.loginRecords[0]?.createdAt ?? null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      rateLimitTier: u.rateLimitTier,
      twoFactorEnabled: u.twoFactorEnabled,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: lastLogin ? lastLogin.toISOString() : null,
      jobsCount: u._count.jobs,
      totalPhotos,
      totalCost,
      referralCount: referralCountMap.get(u.id) ?? 0,
    };
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
          <UsersTable users={users} currentUserId={auth.userId} />
        </Card>
      </div>
    </>
  );
}
