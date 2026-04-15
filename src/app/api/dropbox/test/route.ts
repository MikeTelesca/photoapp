import { NextResponse } from "next/server";
import { testConnection } from "@/lib/dropbox";
import { requireAdmin } from "@/lib/api-auth";

// GET /api/dropbox/test - test Dropbox connection
export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  try {
    if (!process.env.DROPBOX_ACCESS_TOKEN) {
      return NextResponse.json(
        { connected: false, error: "No DROPBOX_ACCESS_TOKEN configured" },
        { status: 200 }
      );
    }

    const account = await testConnection();
    return NextResponse.json({ connected: true, account });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Connection failed";
    return NextResponse.json(
      { connected: false, error: message },
      { status: 200 }
    );
  }
}
