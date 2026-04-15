import { prisma } from "@/lib/db";

export async function logError(opts: {
  source: string;
  message: string;
  jobId?: string;
  photoId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        source: opts.source,
        message: opts.message,
        jobId: opts.jobId,
        photoId: opts.photoId,
        userId: opts.userId,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
      },
    });
  } catch (err) {
    console.error("[errorLog] failed to log:", err);
  }
}
