import { Dropbox } from "dropbox";
import { prisma } from "./db";
import { detectJobTwilight } from "./twilight-detect";
import { slugifyForFilename } from "./dropbox";
import { groupFilesByExif } from "./bracket-from-dropbox";
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

    // Only top-level entries. We intentionally do NOT recurse into subfolders
    // because the Edited/ and _thumbs/ subfolders we create during enhance
    // would otherwise pollute the source-image list and break bracket
    // grouping on re-sync.
    const allEntries = listResponse.result.entries as DropboxEntry[];

    // Filter out files that match our enhanced-output naming convention
    // ({address-slug}-NN.jpg) to cover the case where an old enhance run
    // wrote outputs at the top level before we moved them into Edited/.
    const slug = slugifyForFilename(job.address);
    const enhancedPattern = new RegExp(
      `^${slug.replace(/[-]/g, "\\-")}-\\d{2}\\.jpg$`,
      "i",
    );

    const rawFileCount = allEntries.filter((e) => {
      if (e[".tag"] !== "file") return false;
      const ext = e.name.toLowerCase().slice(e.name.lastIndexOf("."));
      return RAW_EXTENSIONS.includes(ext);
    }).length;

    const imageFiles = allEntries
      .filter((e) => {
        if (e[".tag"] !== "file") return false;
        if (enhancedPattern.test(e.name)) return false; // skip enhanced outputs
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

    // Group by EXIF so mixed brackets + single-frame drone shots don't break
    // the heuristic. Each single frame becomes its own 1-photo group.
    const filesForGrouping = imageFiles.map((f) => ({
      name: f.name,
      path: f.path_lower || f.path_display || "",
      size: f.size || 0,
    }));
    const bracketGroups = await groupFilesByExif(filesForGrouping);
    const groupCount = bracketGroups.length;

    const byName = new Map(filesForGrouping.map((f) => [f.name, f]));
    const photoRecords = bracketGroups.map((g, idx) => {
      const groupFiles = g.photos
        .map((p) => byName.get(p.fileName))
        .filter((f): f is (typeof filesForGrouping)[number] => !!f);
      return {
        jobId,
        orderIndex: idx,
        status: "pending",
        bracketGroup: idx,
        bracketIndex: groupFiles.length,
        exifData: JSON.stringify({
          bracketCount: groupFiles.length,
          photos: groupFiles.map((f) => ({
            fileName: f.name,
            path: f.path,
            size: f.size,
          })),
        }),
        isExterior: false,
        isTwilight: false,
      };
    });

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
      bracketCount: bracketGroups[0]?.photos.length ?? 1,
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
