import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

// kebab-case slug from user-supplied name. Keeps [a-z0-9-] only.
function slugify(raw: string): string {
  const base = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "preset";
}

async function uniqueSlug(photographerId: string, base: string): Promise<string> {
  let slug = base;
  let n = 2;
  // Try base, then base-2, base-3, ...
  while (true) {
    const existing = await prisma.preset.findUnique({
      where: { photographerId_slug: { photographerId, slug } },
    });
    if (!existing) return slug;
    slug = `${base}-${n}`;
    n += 1;
    if (n > 50) return `${base}-${Date.now()}`;
  }
}

// GET /api/presets - list the signed-in user's presets.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const presets = await prisma.preset.findMany({
      where: { photographerId: session.user.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(presets);
  } catch (err: unknown) {
    log.error("presets.list.failed", { err: errorMessage(err) });
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/presets - create a new preset for the signed-in user.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  const gradient =
    typeof input.gradient === "string" && input.gradient.trim() ? input.gradient.trim() : null;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

  try {
    const slug = await uniqueSlug(session.user.id, slugify(name));
    const preset = await prisma.preset.create({
      data: { name, slug, prompt, gradient, photographerId: session.user.id },
    });
    log.info("presets.create.ok", { presetId: preset.id, slug });
    return NextResponse.json(preset, { status: 201 });
  } catch (err: unknown) {
    log.error("presets.create.failed", { err: errorMessage(err) });
    return NextResponse.json({ error: `Database error: ${errorMessage(err)}` }, { status: 500 });
  }
}
