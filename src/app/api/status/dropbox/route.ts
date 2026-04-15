import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { testConnection } from "@/lib/dropbox";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  try {
    const account = await testConnection();
    return NextResponse.json({
      status: "ok",
      email: account.email,
      name: account.name,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      error: err?.message || "Dropbox connection failed",
    }, { status: 200 }); // always 200 so UI can handle
  }
}
