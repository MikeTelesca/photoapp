import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  await prisma.photo.deleteMany({ where: { jobId } });
  await prisma.job.update({ where: { id: jobId }, data: { status: "processing" } });

  const token = process.env.DROPBOX_ACCESS_TOKEN;
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  if (!token && !refreshToken) {
    return NextResponse.json({ error: "No Dropbox token" }, { status: 500 });
  }

  // Helper to get a fresh access token if we only have a refresh token
  async function getAccessToken(): Promise<string> {
    if (token) return token;
    const res = await fetch("https://api.dropbox.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken!,
        client_id: process.env.DROPBOX_APP_KEY!,
        client_secret: process.env.DROPBOX_APP_SECRET!,
      }),
    });
    const data = await res.json();
    return data.access_token;
  }

  const accessToken = await getAccessToken();

  // List files in /PhotoApp/uploads/{jobId}/
  const folderPath = `/PhotoApp/uploads/${jobId}`;
  const response = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: folderPath, limit: 2000 }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("list_folder error:", errText);
    return NextResponse.json({ error: "Failed to list uploaded files" }, { status: 500 });
  }

  const data = await response.json();
  const imageFiles = data.entries
    .filter((e: any) => {
      if (e[".tag"] !== "file") return false;
      const ext = e.name.toLowerCase().slice(e.name.lastIndexOf("."));
      return IMAGE_EXTENSIONS.includes(ext);
    })
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  if (imageFiles.length === 0) {
    return NextResponse.json({ error: "No images found" }, { status: 400 });
  }

  const bracketCount = imageFiles.length % 5 === 0 ? 5 : 3;
  const groupCount = Math.ceil(imageFiles.length / bracketCount);

  // Create a shared link for the folder so the existing download logic works.
  // TODO: For uploaded jobs, downloads should use files/download API instead of sharing/get_shared_link_file.
  // Currently the start-enhance route uses the sharing API which only works for shared link folders.
  // Workaround: after upload, create a shared link for the folder and store that as dropboxUrl.
  let folderShareUrl = folderPath;
  try {
    const linkRes = await fetch(
      "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: folderPath,
          settings: { requested_visibility: { ".tag": "public" } },
        }),
      }
    );
    const linkData = await linkRes.json();
    if (linkData.url) {
      folderShareUrl = linkData.url;
    } else if (linkData.error?.[".tag"] === "shared_link_already_exists") {
      const listRes = await fetch(
        "https://api.dropboxapi.com/2/sharing/list_shared_links",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: folderPath, direct_only: true }),
        }
      );
      const listData = await listRes.json();
      if (listData.links?.[0]?.url) folderShareUrl = listData.links[0].url;
    }
  } catch (err) {
    console.error("Failed to create folder share link:", err);
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { dropboxUrl: folderShareUrl, totalPhotos: groupCount, status: "review" },
  });

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
          path: f.path_display || f.path_lower || `${folderPath}/${f.name}`,
          size: f.size || 0,
        })),
      }),
      isExterior: false,
      isTwilight: false,
    });
  }

  await prisma.photo.createMany({ data: photoRecords });

  return NextResponse.json({ added: groupCount, files: imageFiles.length });
}
