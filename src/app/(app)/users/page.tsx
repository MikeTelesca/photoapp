import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { UsersManager } from "@/components/users/users-manager";

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
    <main className="min-h-screen bg-graphite-50 dark:bg-graphite-950 text-graphite-900 dark:text-white">
      <header className="sticky top-0 z-10 border-b border-graphite-200 dark:border-graphite-800 bg-white/90 dark:bg-graphite-950/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/jobs" className="font-semibold text-lg tracking-tight">
            <span className="text-graphite-900 dark:text-white">Batch</span>
            <span className="text-cyan">Base</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/jobs" className="text-graphite-500 hover:text-graphite-900 dark:hover:text-white">
              Jobs
            </Link>
            <Link href="/users" className="text-graphite-900 dark:text-white font-medium">
              Users
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
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
    </main>
  );
}
