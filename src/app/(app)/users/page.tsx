import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { UsersManager } from "@/components/users/users-manager";
import { AppNav } from "@/components/layout/app-nav";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "admin") redirect("/jobs");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="min-h-screen bg-graphite-950 text-white">
      <AppNav active="users" isAdmin />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 pt-10 pb-16 space-y-8">
        <section>
          <div className="text-[11px] uppercase tracking-[0.25em] text-graphite-500 mb-3">
            Admin
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.02]">
            <span className="text-white">Users</span>
            <span className="text-cyan">.</span>
          </h1>
        </section>

        <div className="rounded-3xl bg-graphite-900 border border-graphite-800 p-6 sm:p-8">
          <UsersManager
            initialUsers={users.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              createdAt: u.createdAt.toISOString(),
            }))}
            selfId={session.user.id}
          />
        </div>
      </div>
    </main>
  );
}
