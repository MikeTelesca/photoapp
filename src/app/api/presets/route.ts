import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/presets - list all presets
export async function GET() {
  try {
    const presets = await prisma.preset.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json(presets);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/presets - create a new preset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, promptModifiers } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const preset = await prisma.preset.create({
      data: { name, slug, description: description || "", promptModifiers: promptModifiers || "" },
    });

    return NextResponse.json(preset, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
