import { listFilesFromSharedLink, downloadFileFromSharedLink } from "./dropbox";
import { readExif, ExifInfo } from "./exif";
import { groupBrackets, detectBracketCount } from "./bracket-grouping";
import { prisma } from "./db";

export interface IngestResult {
  jobId: string;
  totalFiles: number;
  bracketGroups: number;
  bracketCount: number;
  photosCreated: number;
}

/**
 * Ingest photos from a Dropbox shared link for a job.
 *
 * 1. List files from Dropbox
 * 2. Download each file and read EXIF
 * 3. Group into brackets
 * 4. Create Photo records in DB
 * 5. Update Job status and counts
 */
export async function ingestFromDropbox(jobId: string): Promise<IngestResult> {
  // Get the job
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);
  if (!job.dropboxUrl) throw new Error(`Job ${jobId} has no Dropbox URL`);

  // Update status to processing
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "processing" },
  });

  try {
    // 1. List files from Dropbox
    console.log(`[ingest] Listing files from Dropbox for job ${jobId}...`);
    const files = await listFilesFromSharedLink(job.dropboxUrl);
    console.log(`[ingest] Found ${files.length} image files`);

    if (files.length === 0) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "review", totalPhotos: 0 },
      });
      return { jobId, totalFiles: 0, bracketGroups: 0, bracketCount: 0, photosCreated: 0 };
    }

    // 2. Download files and read EXIF (process in batches to avoid memory issues)
    const BATCH_SIZE = 10;
    const allExifData: ExifInfo[] = [];

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          try {
            console.log(`[ingest] Downloading ${file.name} (${i + batch.indexOf(file) + 1}/${files.length})...`);
            const buffer = await downloadFileFromSharedLink(job.dropboxUrl!, file.path);
            const exif = await readExif(buffer, file.name);
            return exif;
          } catch (error) {
            console.warn(`[ingest] Failed to process ${file.name}:`, error);
            return null;
          }
        })
      );

      allExifData.push(...batchResults.filter((r): r is ExifInfo => r !== null));

      // Update progress
      await prisma.job.update({
        where: { id: jobId },
        data: { processedPhotos: allExifData.length },
      });
    }

    // 3. Detect bracket count and group
    const bracketCount = detectBracketCount(allExifData);
    console.log(`[ingest] Detected ${bracketCount}-bracket shooting`);

    const groups = groupBrackets(allExifData, bracketCount);
    console.log(`[ingest] Grouped into ${groups.length} bracket sets`);

    // 4. Create Photo records — one per bracket GROUP (the merged result)
    const photoRecords = groups.map((group, index) => ({
      jobId,
      orderIndex: index,
      status: "pending" as const,
      bracketGroup: group.groupIndex,
      bracketIndex: group.bracketCount,
      exifData: JSON.stringify({
        bracketCount: group.bracketCount,
        photos: group.photos.map((p) => ({
          fileName: p.fileName,
          exposureCompensation: p.exposureCompensation,
          exposureTime: p.exposureTime,
          iso: p.iso,
        })),
        avgTimestamp: group.avgTimestamp?.toISOString(),
      }),
      isExterior: false, // Will be detected by AI later
      isTwilight: false,
      widthPx: group.photos[0]?.width,
      heightPx: group.photos[0]?.height,
    }));

    // Batch create photos
    await prisma.photo.createMany({ data: photoRecords });

    // 5. Update job
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "review", // For now, skip processing and go to review. HDR merge comes later.
        totalPhotos: groups.length,
        processedPhotos: groups.length,
      },
    });

    console.log(`[ingest] Job ${jobId} ingested: ${groups.length} photos from ${files.length} files`);

    return {
      jobId,
      totalFiles: files.length,
      bracketGroups: groups.length,
      bracketCount,
      photosCreated: groups.length,
    };
  } catch (error) {
    console.error(`[ingest] Error processing job ${jobId}:`, error);
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "pending" }, // Reset to pending on error
    });
    throw error;
  }
}
