import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";

// Supported formats (JPEG/PNG can be sent to AI directly)
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];
// RAW formats - detected but NOT processed (flagged to user)
const RAW_EXTENSIONS = [".dng", ".cr2", ".cr3", ".arw", ".nef", ".raf", ".tif", ".tiff"];

export async function POST(request: NextRequest) {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;

  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "Dropbox URL is required" }, { status: 400 });
    }

    const token = process.env.DROPBOX_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Dropbox not configured" }, { status: 500 });
    }

    // List top-level folder
    const response = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: "",
        shared_link: { url },
        limit: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Dropbox API error: ${errText}` }, { status: 500 });
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
            shared_link: { url },
            limit: 2000,
          }),
        });
        if (subResponse.ok) {
          const subData = await subResponse.json();
          allEntries.push(...subData.entries);
        }
      } catch (err) {
        console.error(`Failed to list subfolder ${folder.name}:`, err);
      }
    }

    // Count RAW files (not supported)
    const rawFileCount = allEntries.filter((entry: any) => {
      if (entry[".tag"] !== "file") return false;
      const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf("."));
      return RAW_EXTENSIONS.includes(ext);
    }).length;

    // Filter to supported image files
    const files = allEntries
      .filter((entry: any) => {
        if (entry[".tag"] !== "file") return false;
        const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf("."));
        return IMAGE_EXTENSIONS.includes(ext);
      })
      .map((entry: any) => ({
        name: entry.name,
        path: entry.path_lower || entry.path_display || "",
        size: entry.size || 0,
        id: entry.id || "",
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return NextResponse.json({ fileCount: files.length, files, rawFileCount });
  } catch (error: any) {
    console.error("Dropbox list error:", error);
    return NextResponse.json({ error: error.message || "Failed to list files" }, { status: 500 });
  }
}
