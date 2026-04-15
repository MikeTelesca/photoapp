import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  try {
    const body = await request.json();

    if (!body || !Array.isArray(body.presets)) {
      return NextResponse.json({ error: "Invalid format: expected { presets: [...] }" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const p of body.presets) {
      if (!p.name || !p.slug) {
        skipped++;
        errors.push(`Skipped: missing name or slug in preset`);
        continue;
      }

      try {
        // Check if slug already exists
        const existing = await prisma.preset.findUnique({
          where: { slug: p.slug },
        });

        if (existing) {
          skipped++;
          errors.push(`Skipped: preset with slug "${p.slug}" already exists`);
          continue;
        }

        await prisma.preset.create({
          data: {
            name: p.name,
            slug: p.slug,
            description: p.description || "",
            promptModifiers: p.promptModifiers || "",
            isDefault: p.isDefault || false,
          },
        });
        created++;
      } catch (err: any) {
        skipped++;
        errors.push(`Error creating preset "${p.name}": ${err.message}`);
        console.error("preset import err:", err);
      }
    }

    return NextResponse.json({
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
