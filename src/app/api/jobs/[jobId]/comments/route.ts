import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { notify } from "@/lib/notify";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const comments = await prisma.jobComment.findMany({
    where: { jobId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true, email: true } } },
  }).catch(() => []);

  // Fetch reactions for each comment
  const commentsWithReactions = await Promise.all(
    comments.map(async (comment) => {
      const reactions = await prisma.commentReaction.findMany({
        where: { commentId: comment.id, commentType: "job" },
      });
      const grouped: Record<string, number> = {};
      for (const r of reactions) {
        grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
      }
      return { ...comment, reactions: grouped };
    })
  );

  return NextResponse.json({ comments: commentsWithReactions });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const { body } = await request.json();
  if (!body || !body.trim()) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }

  const created = await prisma.jobComment.create({
    data: {
      jobId,
      authorId: access.userId,
      body: body.trim().slice(0, 2000),
    },
    include: { author: { select: { name: true, email: true } } },
  });

  // Parse @mentions
  const mentionMatches = body.matchAll(/@([a-zA-Z0-9._-]+)/g);
  const mentionedNames = new Set<string>();
  for (const m of mentionMatches) {
    mentionedNames.add(m[1].toLowerCase());
  }

  if (mentionedNames.size > 0) {
    // Look up matching users
    const users = await prisma.user.findMany({
      where: {
        OR: Array.from(mentionedNames).map(name => ({
          OR: [
            { name: { equals: name, mode: "insensitive" } },
            { name: { contains: name, mode: "insensitive" } },
            { email: { startsWith: name + "@", mode: "insensitive" } },
          ],
        })),
      },
      select: { id: true },
    }).catch(() => []);

    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { address: true } });

    for (const u of users) {
      if (u.id === access.userId) continue; // don't notify self
      await notify({
        userId: u.id,
        type: "mention",
        title: `${created.author?.name || created.author?.email} mentioned you`,
        body: `On "${job?.address}": ${body.trim().slice(0, 100)}`,
        href: `/review/${jobId}`,
      }).catch(() => {});
    }
  }

  return NextResponse.json(created);
}
