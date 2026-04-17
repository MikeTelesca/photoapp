import { Dropbox } from "dropbox";
import { prisma } from "./db";
import { detectJobTwilight } from "./twilight-detect";
import { log } from "./logger";

export interface IngestResult {
  jobId: string;
  totalFiles: number;
  bracketGroups: number;
  bracketCount: number;
  photosCreated: number;
}

// DNG is supported — Autoenhance accepts DNG and does its own RAW handling.
// Other RAW formats (CR2/ARW/NEF/RAF/TIFF) still need exporting to JPEG first.
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".dng"];
const RAW_EXTENSIONS = [".cr2", ".cr3", ".arw", ".nef", ".raf", ".tif", ".tiff"];

function dbx(): Dropbox {
  if (process.env.DROPBOX_REFRESH_TOKEN) {
    return new Dropbox({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
      refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
      fetch: globalThis.fetch,
    });
  }
  if (process.env.DROPBOX_ACCESS_TOKEN) {
    return new Dropbox({
      accessToken: process.env.DROPBOX_ACCESS_TOKEN,
      fetch: globalThis.fetch,
    });
  }
  throw new Error("No Dropbox credentials configured");
}

type DropboxEntry = {
  [".tag"]: string;
  name: string;
  path_lower?: string;
  path_display?: string;
  size?: number;
};

/**
 * Ingest photos from the Dropbox folder tied to this job. Uses the SDK (which
 * auto-refreshes access tokens via DROPBOX_REFRESH_TOKEN) instead of raw
 * fetch against a short-lived DROPBOX_ACCESS_TOKEN.
 */
export async function ingestFromDropbox(jobId: string): Promise<IngestResult> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { agent: true },
  });
  if (!job) throw new Error(`Job ${jobId} not found`);
  if (!job.dropboxUrl) throw new Error(`Job ${jobId} has no Dropbox URL`);

  await prisma.photo.deleteMany({ where: { jobId } });
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "processing" },
  });

  try {
    const client = dbx();
    const listResponse = await client.filesListFolder({
      path: "",
      shared_link: { url: job.dropboxUrl },
      limit: 2000,
    });

    const allEntries: DropboxEntry[] = [...(listResponse.result.entries as DropboxEntry[])];

    // Recurse into subfolders
    const folders = allEntries.filter((e) => e[".tag"] === "folder");
    for (const folder of folders) {
      try {
        const subPath = folder.path_lower || folder.path_display || "";
        if (!subPath) continue;
        const subResponse = await client.filesListFolder({
          path: subPath,
          shared_link: { url: job.dropboxUrl },
          limit: 2000,
        });
        allEntries.push(...(subResponse.result.entries as DropboxEntry[]));
      } catch (err: unknown) {
        log.warn("ingest.subfolder_list_failed", {
          jobId,
          folder: folder.name,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const rawFileCount = allEntries.filter((e) => {
      if (e[".tag"] !== "file") return false;
      const ext = e.name.toLowerCase().slice(e.name.lastIndexOf("."));
      return RAW_EXTENSIONS.includes(ext);
    }).length;

    const imageFiles = allEntries
      .filter((e) => {
        if (e[".tag"] !== "file") return false;
        const ext = e.name.toLowerCase().slice(e.name.lastIndexOf("."));
        return IMAGE_EXTENSIONS.includes(ext);
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    if (imageFiles.length === 0) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "pending", totalPhotos: 0 },
      });
      if (rawFileCount > 0) {
        throw new Error(
          `Found ${rawFileCount} RAW files (DNG/CR2/ARW/NEF) but no JPEGs. RAW formats aren't supported — please export as JPEG and try again.`,
        );
      }
      return { jobId, totalFiles: 0, bracketGroups: 0, bracketCount: 0, photosCreated: 0 };
    }

    const bracketCount =
      imageFiles.length % 5 === 0 ? 5 : imageFiles.length % 3 === 0 ? 3 : 1;
    const groupCount = Math.ceil(imageFiles.length / bracketCount);

    const photoRecords = [];
    for (let g = 0; g < groupCount; g += 1) {
      const startIdx = g * bracketCount;
      const groupFiles = imageFiles.slice(startIdx, startIdx + bracketCount);

      photoRecords.push({
        jobId,
        orderIndex: g,
        status: "pending",
        bracketGroup: g,
        bracketIndex: groupFiles.length,
        exifData: JSON.stringify({
          bracketCount: groupFiles.length,
          photos: groupFiles.map((f) => ({
            fileName: f.name,
            path: f.path_lower || f.path_display || "",
            size: f.size || 0,
          })),
        }),
        isExterior: false,
        isTwilight: false,
      });
    }

    await prisma.photo.createMany({ data: photoRecords });

    const isTwilight = detectJobTwilight(photoRecords.map((p) => p.exifData));

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "pending",
        totalPhotos: groupCount,
        processedPhotos: 0,
        ...(isTwilight && !job.seasonalStyle && { seasonalStyle: "twilight" }),
      },
    });

    return {
      jobId,
      totalFiles: imageFiles.length,
      bracketGroups: groupCount,
      bracketCount,
      photosCreated: groupCount,
    };
  } catch (error: unknown) {
    log.error("ingest.failed", {
      jobId,
      err: error instanceof Error ? error.message : String(error),
    });
    await prisma.job.update({ where: { id: jobId }, data: { status: "pending" } });
    throw error;
  }
}
