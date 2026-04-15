import { prisma } from "./db";

export async function logActivity(opts: {
  type: string;
  message: string;
  jobId?: string;
  photoId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        type: opts.type,
        message: opts.message,
        jobId: opts.jobId || null,
        photoId: opts.photoId || null,
        userId: opts.userId || null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
      },
    });
  } catch (err) {
    // Don't let activity logging failures break the main flow
    console.error("[activity] Failed to log:", err);
  }
}
