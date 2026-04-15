import { prisma } from "@/lib/db";

export async function logDownload(opts: {
  userId?: string;
  jobId?: string;
  photoId?: string;
  type: "zip" | "mls" | "single" | "invoice" | "pdf-gallery";
  preset?: string;
  count?: number;
}): Promise<void> {
  try {
    await prisma.downloadLog.create({
      data: opts,
    });
  } catch (err) {
    console.error("[downloadLog] failed:", err);
  }
}
