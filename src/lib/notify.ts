import { prisma } from "@/lib/db";

export async function shouldNotify(userId: string, type: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        notifyJobReady: true,
        notifyClientComment: true,
        notifyPhotoFailed: true,
      },
    });
    if (!user) return true;
    switch (type) {
      case "job-ready": return user.notifyJobReady ?? true;
      case "client-comment": return user.notifyClientComment ?? true;
      case "photo-failed": return user.notifyPhotoFailed ?? true;
      default: return true;
    }
  } catch {
    return true;
  }
}

export async function notify(opts: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  href?: string;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        href: opts.href,
      },
    });
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

/**
 * Notify every user watching this job about a status change.
 * Skips the job's own photographer (they already get direct notifications)
 * and any explicitly excluded userId (e.g. the actor who triggered the change).
 */
export async function notifyJobWatchers(opts: {
  jobId: string;
  newStatus: "review" | "approved";
  jobAddress: string;
  photographerId: string;
  excludeUserId?: string;
}): Promise<void> {
  try {
    const watches = await prisma.jobWatch.findMany({
      where: { jobId: opts.jobId },
      select: { userId: true },
    });
    if (watches.length === 0) return;

    const title =
      opts.newStatus === "review"
        ? `Watched job ready for review`
        : `Watched job approved`;
    const body = `${opts.jobAddress} — status: ${opts.newStatus}`;
    const href =
      opts.newStatus === "review"
        ? `/review/${opts.jobId}`
        : `/review/${opts.jobId}`;

    await Promise.all(
      watches
        .filter(
          (w) =>
            w.userId !== opts.photographerId &&
            w.userId !== opts.excludeUserId
        )
        .map((w) =>
          notify({
            userId: w.userId,
            type: "job-watch",
            title,
            body,
            href,
          })
        )
    );
  } catch (err) {
    console.error("[notifyJobWatchers] failed:", err);
  }
}
