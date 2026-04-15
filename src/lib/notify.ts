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
