import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user?.invoiceLogoPath) return NextResponse.json({ error: "No logo" }, { status: 404 });

  const { Dropbox } = await import("dropbox");
  const token = process.env.DROPBOX_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "No dropbox" }, { status: 500 });

  const dbx = new Dropbox({ accessToken: token, fetch: globalThis.fetch });
  try {
    const dl = await dbx.filesDownload({ path: user.invoiceLogoPath });
    const buf = (dl.result as any).fileBinary;
    const isPng = user.invoiceLogoPath.toLowerCase().endsWith(".png");
    return new NextResponse(buf, {
      headers: { "Content-Type": isPng ? "image/png" : "image/jpeg" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
