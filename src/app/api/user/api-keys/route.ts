import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { createApiKey } from "@/lib/api-keys";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const keys = await prisma.apiKey.findMany({
    where: { userId: auth.userId, revokedAt: null },
    select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  }).catch(() => []);

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { name } = await request.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const { key, id } = await createApiKey({ userId: auth.userId, name: name.trim() });

  return NextResponse.json({ key, id, warning: "This is the only time this key will be shown. Save it now." });
}
