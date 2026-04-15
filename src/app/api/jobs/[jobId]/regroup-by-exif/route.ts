import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { readExif } from "@/lib/exif";
import { groupBrackets, detectBracketCount } from "@/lib/bracket-grouping";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function downloadFromDropbox(sharedUrl: string, fileName: string): Promise<Buffer> {
  const token = process.env.DROPBOX_ACCESS_TOKEN;
  if (!token) throw new Error("No Dropbox token");
  const response = await fetch("https://content.dropboxapi.com/2/sharing/get_shared_link_file", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({ url: sharedUrl, path: `/${fileName.toLowerCase()}` }),
    },
  });
  if (!response.ok) throw new Error("Failed to download");
  return Buffer.from(await response.arrayBuffer());
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = access.job;
  if (!job || !(job as any).dropboxUrl) {
    return NextResponse.json({ error: "Job has no Dropbox URL" }, { status: 400 });
  }

  // Get all unique source filenames from existing photos
  const photos = await prisma.photo.findMany({ where: { jobId } });
  const allFiles = new Set<string>();
  for (const p of photos) {
    try {
      const exif = JSON.parse(p.exifData || "{}");
      for (const f of (exif.photos || [])) {
        allFiles.add(f.fileName);
      }
    } catch {
      // skip unparseable exifData
    }
  }

  const fileList = Array.from(allFiles).sort();
  if (fileList.length === 0) {
    return NextResponse.json({ error: "No source files to regroup" }, { status: 400 });
  }

  // Download each file and read EXIF
  const exifResults = [];
  for (const fileName of fileList) {
    try {
      const buf = await downloadFromDropbox((job as any).dropboxUrl, fileName);
      const exif = await readExif(buf, fileName);
      exifResults.push(exif);
    } catch (err) {
      console.error(`Failed to read EXIF for ${fileName}:`, err);
    }
  }

  if (exifResults.length === 0) {
    return NextResponse.json({ error: "Could not read EXIF from any files" }, { status: 500 });
  }

  // Use the bracket-grouping algorithm
  const detectedBracketCount = detectBracketCount(exifResults);
  const groups = groupBrackets(exifResults, detectedBracketCount);

  // Delete existing photos and recreate based on EXIF grouping
  await prisma.photo.deleteMany({ where: { jobId } });

  const newPhotos = groups.map((group, idx) => ({
    jobId,
    orderIndex: idx,
    status: "pending" as const,
    bracketGroup: idx,
    bracketIndex: group.bracketCount,
    exifData: JSON.stringify({
      bracketCount: group.bracketCount,
      photos: group.photos.map(p => ({
        fileName: p.fileName,
        path: `/${p.fileName.toLowerCase()}`,
        size: 0,
      })),
      avgTimestamp: group.avgTimestamp?.toISOString(),
    }),
    isExterior: false,
    isTwilight: false,
  }));

  await prisma.photo.createMany({ data: newPhotos });

  await prisma.job.update({
    where: { id: jobId },
    data: { totalPhotos: groups.length, status: "review" },
  });

  return NextResponse.json({
    success: true,
    bracketCount: detectedBracketCount,
    groupCount: groups.length,
    sourceFiles: fileList.length,
  });
}
