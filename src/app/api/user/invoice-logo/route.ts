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

  if (!/\.(png|jpg|jpeg)$/i.test(file.name) && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "PNG or JPEG only" }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 2MB" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.name.toLowerCase().endsWith(".png") ? "png" : "jpg";
  const path = `/ath-editor-invoice-logos/${auth.userId}/logo.${ext}`;

  try {
    const result = await uploadInternalFile(buf, path);
    await prisma.user.update({
      where: { id: auth.userId },
      data: { invoiceLogoPath: result.path },
    });
    return NextResponse.json({ path: result.path });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await prisma.user.update({
    where: { id: auth.userId },
    data: { invoiceLogoPath: null },
  });
  return NextResponse.json({ ok: true });
}
