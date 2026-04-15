import { NextResponse } from "next/server";
import { verifyApiKey } from "./api-keys";

export async function requireApiKey(request: Request): Promise<{ userId: string } | { error: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ath_")) {
    return {
      error: NextResponse.json(
        { error: "Missing or invalid Authorization header. Use 'Bearer ath_...'" },
        { status: 401 }
      ),
    };
  }

  const key = authHeader.slice(7);
  const result = await verifyApiKey(key);
  if (!result) {
    return {
      error: NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 }),
    };
  }

  return { userId: result.userId };
}
