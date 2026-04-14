import { prisma } from "./db";

export interface IngestResult {
  jobId: string;
  totalFiles: number;
  bracketGroups: number;
  bracketCount: number;
  photosCreated: number;
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".tif", ".tiff", ".dng", ".cr2", ".cr3", ".arw", ".nef", ".raf"];

/**
 * Ingest photos from a Dropbox shared link.
 * This is lightweight — just lists files and creates Photo records.
 * Actual downloading and AI enhancement happens separately per-photo.
 */
export async function ingestFromDropbox(jobId: string): Promise<IngestResult> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);
  if (!job.dropboxUrl) throw new Error(`Job ${jobId} has no Dropbox URL`);

  // Clear any existing photos from a previous ingest attempt
  await prisma.photo.deleteMany({ where: { jobId } });

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "processing" },
  });

  try {
    // List files from Dropbox using raw API (fast, no downloads)
    const token = process.env.DROPBOX_ACCESS_TOKEN;
    if (!token) throw new Error("No Dropbox access token");

    const response = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: "",
        shared_link: { url: job.dropboxUrl },
        limit: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Dropbox API error: ${errText}`);
    }

    const data = await response.json();
    let allEntries = [...data.entries];

    // Check for subfolders and list their contents
    const folders = data.entries.filter((e: any) => e[".tag"] === "folder");
    for (const folder of folders) {
      try {
        const subResponse = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: folder.path_lower || folder.path_display,
            shared_link: { url: job.dropboxUrl },
            limit: 2000,
          }),
        });
        if (subResponse.ok) {
          const subData = await subResponse.json();
          allEntries.push(...subData.entries);
        }
      } catch (err) {
        console.error(`[ingest] Failed to list subfolder ${folder.name}:`, err);
      }
    }

    // Filter to image files and sort by name
    const imageFiles = allEntries
      .filter((entry: any) => {
        if (entry[".tag"] !== "file") return false;
        const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf("."));
        return IMAGE_EXTENSIONS.includes(ext);
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    if (imageFiles.length === 0) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "review", totalPhotos: 0 },
      });
      return { jobId, totalFiles: 0, bracketGroups: 0, bracketCount: 0, photosCreated: 0 };
    }

    // Detect bracket count (3 or 5) from total file count
    const bracketCount = imageFiles.length % 5 === 0 ? 5 : 3;
    const groupCount = Math.ceil(imageFiles.length / bracketCount);

    // Create Photo records — one per bracket group (final output image)
    const photoRecords = [];
    for (let g = 0; g < groupCount; g++) {
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
          photos: groupFiles.map((f: any) => ({
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

    // Set to "review" for now — enhance will be triggered separately
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "review",
        totalPhotos: groupCount,
        processedPhotos: 0,
      },
    });

    return {
      jobId,
      totalFiles: imageFiles.length,
      bracketGroups: groupCount,
      bracketCount,
      photosCreated: groupCount,
    };
  } catch (error) {
    console.error(`[ingest] Error:`, error);
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "pending" },
    });
    throw error;
  }
}
