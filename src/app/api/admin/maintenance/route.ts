import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getMaintenanceState, setMaintenanceState } from "@/lib/maintenance";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const state = await getMaintenanceState();
  return NextResponse.json(state);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: { enabled?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "`enabled` (boolean) is required" },
      { status: 400 },
    );
  }

  const message =
    typeof body.message === "string"
      ? body.message
      : body.message === null
        ? null
        : undefined;

  const state = await setMaintenanceState(body.enabled, message ?? null);
  return NextResponse.json(state);
}
