import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PortfolioSettingsForm } from "@/components/settings/portfolio-settings-form";

export const dynamic = "force-dynamic";

export default async function PortfolioSettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      portfolioSlug: true,
      portfolioEnabled: true,
      portfolioBio: true,
    },
  });

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-graphite-900 dark:text-white">Public Portfolio</h1>
        <p className="text-sm text-graphite-500 dark:text-graphite-400 mt-1">
          Create a public page showing your best approved work. Turn it on, pick a URL, and share it with clients.
        </p>
      </div>
      <div className="rounded-lg border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 p-6">
        <PortfolioSettingsForm
          initialName={user?.name ?? ""}
          initialSlug={user?.portfolioSlug ?? ""}
          initialEnabled={user?.portfolioEnabled ?? false}
          initialBio={user?.portfolioBio ?? ""}
        />
      </div>
    </div>
  );
}
