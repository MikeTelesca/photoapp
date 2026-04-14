import { prisma } from "@/lib/db";
import { Topbar } from "@/components/layout/topbar";
import { PhotographersManager } from "@/components/photographers/photographers-manager";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PhotographersPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") {
    redirect("/dashboard");
  }
  let users: any[] = [];
  try {
    users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { jobs: true } } },
      orderBy: { createdAt: "asc" },
    });
  } catch {}

  const serialized = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    jobCount: u._count?.jobs || 0,
    createdAt: u.createdAt?.toISOString?.() || new Date().toISOString(),
  }));

  return (
    <>
      <Topbar title="Photographers" subtitle="Manage photographer accounts" />
      <div className="p-6">
        <PhotographersManager initialUsers={serialized} />
      </div>
    </>
  );
}
