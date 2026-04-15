import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { uploadInternalFile } from "@/lib/dropbox";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = await prisma.photo.findMany({
    where: { jobId, status: "approved" },
    orderBy: { orderIndex: "asc" },
  });

  if (photos.length === 0) {
    return NextResponse.json({ error: "No approved photos" }, { status: 400 });
  }

  const addr = job.address.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const folderPath = `/ATH Edited/${addr}`;

  let uploaded = 0;
  let failed = 0;
  let shareLink: string | null = null;

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const url = p.editedUrl || p.originalUrl;
    if (!url) { failed++; continue; }

    try {
      const res = await fetch(url);
      if (!res.ok) { failed++; continue; }
      const buf = Buffer.from(await res.arrayBuffer());

      // Light re-encode to ensure JPEG quality is consistent
      const encoded = await sharp(buf).jpeg({ quality: 92 }).toBuffer();

      const filename = `${addr}-${String(i + 1).padStart(3, "0")}.jpg`;
      const filePath = `${folderPath}/${filename}`;

      await uploadInternalFile(encoded, filePath);
      uploaded++;
    } catch (err) {
      console.error("sync err:", err);
      failed++;
    }
  }

  // Create a share link for the folder so user can access it
  if (uploaded > 0) {
    try {
      const { Dropbox } = await import("dropbox");
      const dbx = new Dropbox({
        clientId: process.env.DROPBOX_APP_KEY,
        clientSecret: process.env.DROPBOX_APP_SECRET,
        refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
        accessToken: process.env.DROPBOX_REFRESH_TOKEN
          ? undefined
          : process.env.DROPBOX_ACCESS_TOKEN,
        fetch: globalThis.fetch,
      });
      try {
        const link = await dbx.sharingCreateSharedLinkWithSettings({
          path: folderPath,
          settings: { requested_visibility: { ".tag": "public" } },
        });
        shareLink = link.result.url;
      } catch (err: any) {
        if (err?.error?.error?.[".tag"] === "shared_link_already_exists") {
          const links = await dbx.sharingListSharedLinks({ path: folderPath, direct_only: true });
          shareLink = links.result.links[0]?.url || null;
        }
      }
    } catch (err) {
      console.error("share link err:", err);
    }
  }

  // Save the sync result on the job
  await prisma.job.update({
    where: { id: jobId },
    data: {
      dropboxSyncPath: folderPath,
      dropboxSyncUrl: shareLink,
      dropboxSyncedAt: new Date(),
    },
  }).catch(err => console.error("save sync meta err:", err));

  return NextResponse.json({
    ok: true,
    uploaded,
    failed,
    folderPath,
    shareLink,
  });
}
