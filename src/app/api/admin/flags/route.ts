import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { FLAG_KEYS } from "@/lib/feature-flags";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const existing = await prisma.featureFlag.findMany().catch(() => []);
  const existingMap = new Map(existing.map((f) => [f.key, f]));

  // Merge known flags with stored values (default enabled)
  const all = FLAG_KEYS.map((key) => {
    const stored = existingMap.get(key);
    return (
      stored || {
        key,
        name: prettyName(key),
        enabled: true,
        description: null,
      }
    );
  });

  return NextResponse.json({ flags: all });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { key, enabled } = await request.json();
  if (!key || typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "key and enabled required" },
      { status: 400 }
    );
  }

  const flag = await prisma.featureFlag.upsert({
    where: { key },
    update: { enabled },
    create: { key, name: prettyName(key), enabled },
  });

  return NextResponse.json(flag);
}

function prettyName(key: string): string {
  return key
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
