import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { statusSnippets: true },
  });

  const empty = { pending: [], processing: [], review: [], approved: [], rejected: [] };
  let parsed: Record<string, string[]> = empty;
  if (user?.statusSnippets) {
    try {
      const raw = JSON.parse(user.statusSnippets) as Record<string, unknown>;
      parsed = { ...empty };
      for (const key of Object.keys(empty)) {
        const v = raw[key];
        if (Array.isArray(v)) {
          parsed[key] = v.filter((s): s is string => typeof s === "string");
        }
      }
    } catch {
      parsed = empty;
    }
  }

  return NextResponse.json({ statusSnippets: parsed });
}
