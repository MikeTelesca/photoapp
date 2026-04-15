import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ presetId: string }> }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { presetId } = await params;
  const source = await prisma.preset.findUnique({ where: { id: presetId } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Generate unique slug based on source
  const baseSlug = source.slug.replace(/-copy(-\d+)?$/, "");
  let slug = `${baseSlug}-copy`;
  let counter = 1;
  while (await prisma.preset.findUnique({ where: { slug } })) {
    counter++;
    slug = `${baseSlug}-copy-${counter}`;
  }

  const fork = await prisma.preset.create({
    data: {
      name: `${source.name} (copy)`,
      slug,
      description: source.description,
      promptModifiers: source.promptModifiers,
      isDefault: false,
    },
  });

  return NextResponse.json(fork);
}
