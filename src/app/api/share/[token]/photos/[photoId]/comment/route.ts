import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notify, shouldNotify } from "@/lib/notify";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; photoId: string }> }
) {
  const { token, photoId } = await params;

  // Verify token + photo ownership
  const job = await prisma.job.findFirst({
    where: { shareToken: token, shareEnabled: true },
  });
  if (!job) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  const photo = await prisma.photo.findFirst({ where: { id: photoId, jobId: job.id } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { authorName, message } = await request.json();
  if (!authorName || !message) {
    return NextResponse.json({ error: "Name and message required" }, { status: 400 });
  }
  if (message.length > 1000 || authorName.length > 100) {
    return NextResponse.json({ error: "Too long" }, { status: 400 });
  }

  try {
    const comment = await prisma.photoComment.create({
      data: { photoId, authorName: authorName.trim(), message: message.trim() },
    });

    // Check per-event notification preference
    const allowed = await shouldNotify(job.photographerId, "client-comment");
    if (allowed) {
      // In-app notification to the photographer
      await notify({
        userId: job.photographerId,
        type: "client-comment",
        title: `Client comment on ${job.address}`,
        body: `${authorName}: ${message.slice(0, 100)}`,
        href: `/review/${job.id}`,
      }).catch(() => {});
    }

    return NextResponse.json(comment);
  } catch (err) {
    console.error("PhotoComment.create failed (migration may be pending):", err);
    return NextResponse.json({ error: "Could not save comment" }, { status: 500 });
  }
}
