import { NextRequest, NextResponse } from "next/server";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".tif", ".tiff", ".dng", ".cr2", ".cr3", ".arw", ".nef", ".raf"];

// POST /api/dropbox/list - list files from a shared Dropbox link
// Uses raw Dropbox API to avoid SDK compatibility issues on Vercel
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "Dropbox URL is required" }, { status: 400 });
    }

    const token = process.env.DROPBOX_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Dropbox not configured" }, { status: 500 });
    }

    // Call Dropbox API directly
    const dbxResponse = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
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

    if (!dbxResponse.ok) {
      const errText = await dbxResponse.text();
      return NextResponse.json({ error: `Dropbox API error: ${errText}` }, { status: 500 });
    }

    const data = await dbxResponse.json();

    const files = data.entries
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

    return NextResponse.json({ fileCount: files.length, files });
  } catch (error: any) {
    console.error("Dropbox list error:", error);
    return NextResponse.json({ error: error.message || "Failed to list files" }, { status: 500 });
  }
}
