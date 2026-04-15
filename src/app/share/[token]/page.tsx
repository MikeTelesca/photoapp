import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import crypto from "crypto";
import { CommentForm } from "@/components/share/comment-form";
import { PasswordGate } from "@/components/share/password-gate";

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
        include: { comments: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  if (!job) notFound();

  // If password required, check unlock cookie
  if (job.sharePassword) {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(`share-unlock-${token}`);
    const expected = crypto
      .createHmac("sha256", process.env.NEXTAUTH_SECRET || "secret")
      .update(`${token}:${job.sharePassword}`)
      .digest("hex");
    if (!cookie || cookie.value !== expected) {
      // Show password gate
      return <PasswordGate token={token} />;
    }
  }

  const approvedPhotos = job.photos;

  return (
    <div className="min-h-screen bg-graphite-50">
      {/* Header */}
      <header className="bg-white border-b border-graphite-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
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
            <div className="text-xs text-graphite-400">Leave a comment on any photo</div>
          </div>
        </div>
      </header>

      {/* Gallery */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {approvedPhotos.length === 0 ? (
          <div className="text-center py-24 text-graphite-400">
            <p className="text-lg font-medium">No approved photos yet</p>
            <p className="text-sm mt-2">Check back soon — the photographer is still working on your gallery.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {approvedPhotos.map((photo) => {
              const url = photo.editedUrl ?? photo.originalUrl;
              if (!url) return null;
              return (
                <div key={photo.id} className="bg-white rounded-lg overflow-hidden shadow-sm">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:opacity-95 transition-opacity"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Photo of ${job.address}`}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                  </a>
                  <div className="px-3 pb-3">
                    <CommentForm
                      token={token}
                      photoId={photo.id}
                      initialComments={photo.comments.map(c => ({
                        id: c.id,
                        authorName: c.authorName,
                        message: c.message,
                        createdAt: c.createdAt.toISOString(),
                      }))}
                    />
                  </div>
                </div>
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
