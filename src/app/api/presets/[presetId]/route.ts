import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

async function loadOwned(presetId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const preset = await prisma.preset.findUnique({ where: { id: presetId } });
  if (!preset) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (session.user.role !== "admin" && preset.photographerId !== session.user.id) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { preset };
}

// GET /api/presets/:presetId
export async function GET(_req: NextRequest, { params }: { params: Promise<{ presetId: string }> }) {
  const { presetId } = await params;
  const access = await loadOwned(presetId);
  if ("error" in access) return access.error;
  return NextResponse.json(access.preset);
}

// PATCH /api/presets/:presetId - update name/prompt/gradient (slug stays stable).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ presetId: string }> }) {
  const { presetId } = await params;
  const access = await loadOwned(presetId);
  if ("error" in access) return access.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  const data: Record<string, string | null> = {};
  if (typeof input.name === "string") {
    const t = input.name.trim();
    if (!t) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    data.name = t;
  }
  if (typeof input.prompt === "string") {
    const t = input.prompt.trim();
    if (!t) return NextResponse.json({ error: "Prompt cannot be empty" }, { status: 400 });
    data.prompt = t;
  }
  if ("gradient" in input) {
    data.gradient =
      typeof input.gradient === "string" && input.gradient.trim() ? input.gradient.trim() : null;
  }

  try {
    const updated = await prisma.preset.update({ where: { id: presetId }, data });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    log.error("presets.patch.failed", { presetId, err: errorMessage(err) });
    return NextResponse.json({ error: `Database error: ${errorMessage(err)}` }, { status: 500 });
  }
}

// DELETE /api/presets/:presetId
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ presetId: string }> }) {
  const { presetId } = await params;
  const access = await loadOwned(presetId);
  if ("error" in access) return access.error;
  try {
    await prisma.preset.delete({ where: { id: presetId } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    log.error("presets.delete.failed", { presetId, err: errorMessage(err) });
    return NextResponse.json({ error: `Database error: ${errorMessage(err)}` }, { status: 500 });
  }
}
