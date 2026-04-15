import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

const ALLOWED = ["👍", "❤️", "🎉", "😂", "👏", "🔥"];

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { commentId, commentType, emoji } = await request.json();
  if (!commentId || !["job", "photo"].includes(commentType) || !ALLOWED.includes(emoji)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Toggle: try to delete first; if nothing deleted, create
  const deleted = await prisma.commentReaction.deleteMany({
    where: { commentId, commentType, authorId: auth.userId, emoji },
  });

  if (deleted.count === 0) {
    await prisma.commentReaction.create({
      data: { commentId, commentType, emoji, authorId: auth.userId },
    });
  }

  // Return updated reactions for this comment
  const all = await prisma.commentReaction.findMany({
    where: { commentId, commentType },
  });

  // Group by emoji
  const grouped: Record<string, number> = {};
  for (const r of all) {
    grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
  }

  return NextResponse.json({ reactions: grouped });
}

export async function GET(request: NextRequest) {
  // Get reactions for a comment
  const commentId = request.nextUrl.searchParams.get("commentId");
  const commentType = request.nextUrl.searchParams.get("commentType");
  if (!commentId || !commentType) return NextResponse.json({ error: "missing params" }, { status: 400 });

  const all = await prisma.commentReaction.findMany({
    where: { commentId, commentType },
  });
  const grouped: Record<string, number> = {};
  for (const r of all) grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
  return NextResponse.json({ reactions: grouped });
}
