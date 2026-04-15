import { prisma } from "@/lib/db";

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
