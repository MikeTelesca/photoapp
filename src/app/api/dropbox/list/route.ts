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

    if (!process.env.DROPBOX_ACCESS_TOKEN && !process.env.DROPBOX_REFRESH_TOKEN) {
      return NextResponse.json(
        { error: "Dropbox is not configured. Add DROPBOX_ACCESS_TOKEN to environment." },
        { status: 500 }
      );
    }

    const files = await listFilesFromSharedLink(url);

    return NextResponse.json({
      fileCount: files.length,
      files,
    });
  } catch (error: any) {
    console.error("Dropbox list error:", error);
    // Extract the actual Dropbox API error
    const dbxError = error?.error?.error_summary || error?.error?.error || error?.message || "Failed to list Dropbox files";
    return NextResponse.json({ error: typeof dbxError === 'string' ? dbxError : JSON.stringify(dbxError) }, { status: 500 });
  }
}
