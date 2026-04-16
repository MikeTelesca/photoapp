import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AppNav } from "@/components/layout/app-nav";
import { PresetsManager } from "@/components/presets/presets-manager";

export const dynamic = "force-dynamic";

export default async function PresetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const isAdmin = session.user.role === "admin";
  const presets = await prisma.preset.findMany({
    where: { photographerId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="min-h-screen bg-graphite-950 text-white">
      <AppNav active="presets" isAdmin={isAdmin} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 pt-10 pb-16 space-y-8">
        <section>
          <div className="text-[11px] uppercase tracking-[0.25em] text-graphite-500 mb-3">
            Your looks
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.02]">
            <span className="text-white">Presets</span>
            <span className="text-cyan">.</span>
          </h1>
          <p className="mt-4 text-[15px] text-graphite-400 max-w-2xl">
            Built-ins cover most shoots. Custom presets let you bake your exact prompt into a
            one-tap tile in the job form.
          </p>
        </section>

        <PresetsManager
          initialPresets={presets.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            prompt: p.prompt,
            gradient: p.gradient,
          }))}
        />
      </div>
    </main>
  );
}
