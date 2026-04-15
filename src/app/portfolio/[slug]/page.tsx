import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PortfolioGallery } from "@/components/portfolio/portfolio-gallery";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const user = await prisma.user.findFirst({
    where: { portfolioSlug: slug, portfolioEnabled: true },
    select: { name: true, portfolioBio: true },
  });
  if (!user) return { title: "Portfolio not found" };
  return {
    title: `${user.name} · Portfolio`,
    description: user.portfolioBio ?? `Photography portfolio by ${user.name}`,
  };
}

export default async function PublicPortfolioPage({ params }: PageProps) {
  const { slug } = await params;

  const user = await prisma.user.findFirst({
    where: { portfolioSlug: slug, portfolioEnabled: true },
    select: {
      id: true,
      name: true,
      portfolioBio: true,
    },
  });

  if (!user) notFound();

  const photos = await prisma.photo.findMany({
    where: {
      status: "approved",
      job: {
        photographerId: user.id,
        status: "approved",
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 24,
    select: {
      id: true,
      editedUrl: true,
      thumbnailUrl: true,
      originalUrl: true,
      caption: true,
    },
  });

  const displayPhotos = photos
    .map((p) => ({
      id: p.id,
      url: p.editedUrl || p.originalUrl || p.thumbnailUrl || "",
      thumb: p.thumbnailUrl || p.editedUrl || p.originalUrl || "",
      caption: p.caption ?? null,
    }))
    .filter((p) => p.url);

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#0a0a0a] text-graphite-900 dark:text-white">
      <header className="border-b border-graphite-200 dark:border-graphite-800 bg-white/70 dark:bg-graphite-900/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{user.name}</h1>
          {user.portfolioBio && (
            <p className="mt-3 text-sm md:text-base text-graphite-600 dark:text-graphite-300 max-w-2xl whitespace-pre-line">
              {user.portfolioBio}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {displayPhotos.length === 0 ? (
          <div className="text-center py-24 text-graphite-500 dark:text-graphite-400">
            <p className="text-sm">No photos to show yet.</p>
          </div>
        ) : (
          <PortfolioGallery photos={displayPhotos} photographerName={user.name} />
        )}
      </main>

      <footer className="border-t border-graphite-200 dark:border-graphite-800 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 text-[11px] text-graphite-500 dark:text-graphite-500">
          © {new Date().getFullYear()} {user.name}. All photos are the property of the photographer.
        </div>
      </footer>
    </div>
  );
}
