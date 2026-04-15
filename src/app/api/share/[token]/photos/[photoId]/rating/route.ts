import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; photoId: string }> }
) {
  const { token, photoId } = await params;

  const job = await prisma.job.findFirst({
    where: { shareToken: token, shareEnabled: true },
  });
  if (!job) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  const photo = await prisma.photo.findFirst({ where: { id: photoId, jobId: job.id } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { authorName, rating } = await request.json();
  if (!authorName || typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const created = await prisma.photoRating.create({
      data: { photoId, authorName: authorName.trim().slice(0, 100), rating },
    });
    return NextResponse.json(created);
  } catch (err) {
    console.error("rating err:", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
