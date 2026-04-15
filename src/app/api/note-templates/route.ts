import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const cat = request.nextUrl.searchParams.get("category");

  const where: any = { userId: auth.userId };
  if (cat) where.category = cat;

  const templates = await prisma.noteTemplate.findMany({
    where,
    orderBy: { title: "asc" },
  }).catch(() => []);
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { title, body, category } = await request.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }

  const created = await prisma.noteTemplate.create({
    data: {
      userId: auth.userId,
      title: title.trim(),
      body: body.trim(),
      category: category || "general",
    },
  });
  return NextResponse.json(created);
}
