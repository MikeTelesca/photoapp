import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { PasswordGate } from "@/components/share/password-gate";

export const dynamic = "force-dynamic";

export default async function PublicPhotoPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string; photoId: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { token, photoId } = await params;
  const sp = await searchParams;
  const isPreview = sp.preview === "1";
  const session = await auth();

  const job = await prisma.job.findFirst({
    where: { shareToken: token, shareEnabled: true },
    select: {
      id: true,
      address: true,
      photographerId: true,
      shareExpiresAt: true,
      sharePasswordHash: true,
      sharePassword: true,
    },
  });

  if (!job) notFound();

  const isOwner = session?.user?.id === job.photographerId;

  // Expiry check (bypass for owner in preview mode)
  if (
    job.shareExpiresAt &&
    new Date(job.shareExpiresAt) < new Date() &&
    !(isPreview && isOwner)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-graphite-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">⏰</div>
          <h1 className="text-xl font-bold text-graphite-900 mb-2">Link expired</h1>
          <p className="text-sm text-graphite-600">
            This share link expired on{" "}
            {new Date(job.shareExpiresAt).toLocaleDateString()}. Please contact
            the photographer for a new link.
          </p>
        </div>
      </div>
    );
  }

  // Password gate (bypass for owner in preview mode)
  const storedHash = job.sharePasswordHash || job.sharePassword;
  if (storedHash && !(isPreview && isOwner)) {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(`share-auth-${job.id}`);
    const authUnlocked = authCookie?.value === "1";

    const legacyCookie = cookieStore.get(`share-unlock-${token}`);
    const expected = crypto
      .createHmac("sha256", process.env.NEXTAUTH_SECRET || "secret")
      .update(`${token}:${storedHash}`)
      .digest("hex");
    const legacyUnlocked = legacyCookie?.value === expected;

    if (!authUnlocked && !legacyUnlocked) {
      return <PasswordGate token={token} />;
    }
  }

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, jobId: job.id, status: "approved" },
    select: {
      id: true,
      editedUrl: true,
      originalUrl: true,
      caption: true,
      customFilename: true,
    },
  });

  if (!photo) notFound();

  const url = photo.editedUrl ?? photo.originalUrl;
  const title = photo.customFilename || job.address;

  return (
    <div className="min-h-screen bg-graphite-50 flex flex-col">
      <header className="bg-white border-b border-graphite-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-widest text-cyan uppercase mb-1">
              ATH Media
            </div>
            <h1 className="text-lg font-bold text-graphite-900 truncate">
              {title}
            </h1>
            {photo.customFilename && (
              <div className="text-sm text-graphite-500 truncate">
                {job.address}
              </div>
            )}
          </div>
          <Link
            href={`/share/${token}`}
            className="text-sm text-cyan hover:underline whitespace-nowrap"
          >
            ← Full gallery
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {url ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={title}
              className="w-full h-auto object-contain"
            />
            {photo.caption && (
              <div className="px-4 py-3 text-sm text-graphite-700 border-t border-graphite-200">
                {photo.caption}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-24 text-graphite-400">
            <p className="text-lg font-medium">Photo not available</p>
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-graphite-400">
        Powered by ATH Media — Professional Real Estate Photography
      </footer>
    </div>
  );
}
