import { NextRequest, NextResponse } from "next/server";
import { listFilesFromSharedLink } from "@/lib/dropbox";

// POST /api/dropbox/list - list files from a shared Dropbox link
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "Dropbox URL is required" },
        { status: 400 }
      );
    }

    if (!process.env.DROPBOX_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "Dropbox is not configured. Add DROPBOX_ACCESS_TOKEN to .env" },
        { status: 500 }
      );
    }

    const files = await listFilesFromSharedLink(url);

    return NextResponse.json({
      fileCount: files.length,
      files,
    });
  } catch (error: unknown) {
    console.error("Dropbox list error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to list Dropbox files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
