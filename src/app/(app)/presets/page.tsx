import { prisma } from "@/lib/db";
import { Topbar } from "@/components/layout/topbar";
import { PresetsManager } from "@/components/presets/presets-manager";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PresetsPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") {
    redirect("/dashboard");
  }
  let presets: any[] = [];
  try {
    presets = await prisma.preset.findMany({ orderBy: { createdAt: "asc" } });
  } catch {}

  const serialized = presets.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <>
      <Topbar title="Editing Presets" subtitle="Manage your photo editing styles" />
      <div className="p-6">
        <PresetsManager initialPresets={serialized} />
      </div>
    </>
  );
}
