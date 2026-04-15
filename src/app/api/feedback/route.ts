import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  // Allow even if not authenticated (treat as anonymous)
  const userId = "userId" in auth ? auth.userId : null;

  const { category, message, pageUrl } = await request.json();
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  if (!["bug", "feature", "question", "other"].includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") || "";
  const metadata = JSON.stringify({ pageUrl, userAgent });

  await prisma.feedbackReport.create({
    data: {
      userId,
      category,
      message: message.trim().slice(0, 5000),
      metadata,
    },
  });

  return NextResponse.json({ ok: true });
}
