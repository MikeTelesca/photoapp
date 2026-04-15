import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { uploadInternalFile } from "@/lib/dropbox";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  if (!/\.png$/i.test(file.name) && file.type !== "image/png") {
    return NextResponse.json({ error: "PNG only" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 2MB" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const path = `/ath-editor-logos/${auth.userId}/logo.png`;

  try {
    const result = await uploadInternalFile(buf, path);
    await prisma.user.update({
      where: { id: auth.userId },
      data: { watermarkLogoPath: result.path },
    });
    return NextResponse.json({ path: result.path });
  } catch (err: any) {
    console.error("logo upload err:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await prisma.user.update({
    where: { id: auth.userId },
    data: { watermarkLogoPath: null },
  });
  return NextResponse.json({ ok: true });
}
