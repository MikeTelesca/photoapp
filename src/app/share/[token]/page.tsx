import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const job = await prisma.job.findFirst({
    where: { shareToken: token, shareEnabled: true },
    include: {
      photos: {
        where: { status: "approved" },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!job) notFound();

  const approvedPhotos = job.photos;

  return (
    <div className="min-h-screen bg-graphite-50">
      {/* Header */}
      <header className="bg-white border-b border-graphite-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold tracking-widest text-cyan uppercase mb-1">
              ATH Media
            </div>
            <h1 className="text-lg font-bold text-graphite-900">{job.address}</h1>
            <div className="text-sm text-graphite-500 flex gap-4 mt-0.5">
              {job.clientName && <span>For {job.clientName}</span>}
              <span>{approvedPhotos.length} approved photo{approvedPhotos.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-graphite-400">Read-only preview</div>
          </div>
        </div>
      </header>

      {/* Gallery */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {approvedPhotos.length === 0 ? (
          <div className="text-center py-24 text-graphite-400">
            <p className="text-lg font-medium">No approved photos yet</p>
            <p className="text-sm mt-2">Check back soon — the photographer is still working on your gallery.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {approvedPhotos.map((photo) => {
              const url = photo.editedUrl ?? photo.originalUrl;
              if (!url) return null;
              return (
                <a
                  key={photo.id}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block break-inside-avoid rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Photo of ${job.address}`}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </a>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-graphite-400">
        Powered by ATH Media &mdash; Professional Real Estate Photography
      </footer>
    </div>
  );
}
