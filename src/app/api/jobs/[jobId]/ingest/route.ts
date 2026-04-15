import { NextRequest, NextResponse } from "next/server";
import { ingestFromDropbox } from "@/lib/ingest";
import { requireJobAccess } from "@/lib/api-auth";

// POST /api/jobs/:jobId/ingest - start ingesting photos from Dropbox
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  try {
    const result = await ingestFromDropbox(jobId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: error.message || "Ingestion failed" },
      { status: 500 }
    );
  }
}
