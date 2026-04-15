import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  try {
    const presets = await prisma.preset.findMany({
      orderBy: { createdAt: "asc" },
      select: { name: true, slug: true, description: true, promptModifiers: true, isDefault: true },
    });

    const data = {
      app: "ath-editor",
      version: 1,
      exportedAt: new Date().toISOString(),
      presets,
    };

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="presets-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
