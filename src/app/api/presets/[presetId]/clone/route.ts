import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ presetId: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { presetId } = await params;
  const original = await prisma.preset.findUnique({ where: { id: presetId } });
  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Generate unique slug
  let slug = `${original.slug}-copy`;
  let counter = 1;
  while (await prisma.preset.findUnique({ where: { slug } })) {
    counter++;
    slug = `${original.slug}-copy-${counter}`;
  }

  const cloned = await prisma.preset.create({
    data: {
      name: `${original.name} (Copy)`,
      slug,
      description: original.description,
      promptModifiers: original.promptModifiers,
      isDefault: false,
    },
  });

  return NextResponse.json({ id: cloned.id, slug: cloned.slug });
}
