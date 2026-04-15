import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { Dropbox } from "dropbox";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user?.watermarkLogoPath) return NextResponse.json({ error: "No logo" }, { status: 404 });

  const token = process.env.DROPBOX_REFRESH_TOKEN ? null : process.env.DROPBOX_ACCESS_TOKEN;
  if (!token && !process.env.DROPBOX_REFRESH_TOKEN) {
    return NextResponse.json({ error: "No dropbox configured" }, { status: 500 });
  }

  try {
    const dbx = new Dropbox({
      ...(process.env.DROPBOX_REFRESH_TOKEN
        ? {
            clientId: process.env.DROPBOX_APP_KEY,
            clientSecret: process.env.DROPBOX_APP_SECRET,
            refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
          }
        : { accessToken: token }),
      fetch: globalThis.fetch,
    });

    const dl = await dbx.filesDownload({ path: user.watermarkLogoPath });
    const buf = (dl.result as any).fileBinary;

    if (buf instanceof Buffer) {
      return new NextResponse(buf, { headers: { "Content-Type": "image/png" } });
    }

    if (buf instanceof Uint8Array) {
      return new NextResponse(Buffer.from(buf), { headers: { "Content-Type": "image/png" } });
    }

    if (buf instanceof ArrayBuffer) {
      return new NextResponse(Buffer.from(buf), { headers: { "Content-Type": "image/png" } });
    }

    return NextResponse.json({ error: "Unexpected file format" }, { status: 500 });
  } catch (err: any) {
    console.error("logo preview err:", err);
    return NextResponse.json({ error: err.message || "Download failed" }, { status: 500 });
  }
}
