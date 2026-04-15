import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import crypto from "crypto";
import { CommentForm } from "@/components/share/comment-form";
import { StarRating } from "@/components/share/star-rating";
import { PasswordGate } from "@/components/share/password-gate";
import { ShareContactForm } from "@/components/share/contact-form";

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
        include: {
            comments: { orderBy: { createdAt: "asc" } },
            ratings: { orderBy: { createdAt: "asc" } },
          },
      },
    },
  });

  if (!job) notFound();

  // Check if share link has expired
  if (job.shareExpiresAt && new Date(job.shareExpiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-graphite-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">⏰</div>
          <h1 className="text-xl font-bold text-graphite-900 mb-2">Link expired</h1>
          <p className="text-sm text-graphite-600">
            This share link expired on {new Date(job.shareExpiresAt).toLocaleDateString()}.
            Please contact the photographer for a new link.
          </p>
        </div>
      </div>
    );
  }

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

  // Track view (fire-and-forget)
  prisma.job.update({
    where: { id: job.id },
    data: {
      shareViewCount: { increment: 1 },
      shareFirstViewedAt: job.shareFirstViewedAt || new Date(),
      shareLastViewedAt: new Date(),
    },
  }).catch(err => console.error("share view track:", err));

  const approvedPhotos = job.photos;

  // Fetch reactions for all comments
  const photosWithReactions = await Promise.all(
    approvedPhotos.map(async (photo) => {
      const commentsWithReactions = await Promise.all(
        photo.comments.map(async (c) => {
          const reactions = await prisma.commentReaction.findMany({
            where: { commentId: c.id, commentType: "photo" },
          });
          const grouped: Record<string, number> = {};
          for (const r of reactions) {
            grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
          }
          return { ...c, reactions: grouped };
        })
      );
      return { ...photo, comments: commentsWithReactions };
    })
  );

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


      {/* Contact Form */}
      <div className="my-6 max-w-2xl mx-auto px-4">
        <ShareContactForm token={token} />
      </div>
      {/* Gallery */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {photosWithReactions.length === 0 ? (
          <div className="text-center py-24 text-graphite-400">
            <p className="text-lg font-medium">No approved photos yet</p>
            <p className="text-sm mt-2">Check back soon — the photographer is still working on your gallery.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {photosWithReactions.map((photo) => {
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
                  <div className="px-3 pt-2 pb-1">
                    <StarRating
                      token={token}
                      photoId={photo.id}
                      initialRatings={photo.ratings.map(r => ({
                        id: r.id,
                        authorName: r.authorName,
                        rating: r.rating,
                        createdAt: r.createdAt.toISOString(),
                      }))}
                    />
                  </div>
                  <div className="px-3 pb-3">
                    <CommentForm
                      token={token}
                      photoId={photo.id}
                      initialComments={photo.comments.map(c => ({
                        id: c.id,
                        authorName: c.authorName,
                        message: c.message,
                        createdAt: c.createdAt.toISOString(),
                        reactions: c.reactions,
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
