import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Nominatim requires a real User-Agent and asks that clients respect
// a 1 request/second rate limit. We proxy the request server-side so
// (a) we control the UA header, and (b) the browser doesn't hammer
// Nominatim directly from the client IP.
//
// GET /api/geocode?q=address
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) return NextResponse.json([]);

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "BatchBase/1.0 (photographer tool; contact via app)",
        "Accept-Language": "en",
      },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json([], { status: 200 });
    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw)) return NextResponse.json([]);

    const simplified = raw
      .map((r) => {
        if (!r || typeof r !== "object") return null;
        const obj = r as Record<string, unknown>;
        const display_name = typeof obj.display_name === "string" ? obj.display_name : "";
        const addr = obj.address as Record<string, unknown> | undefined;
        return {
          displayName: display_name,
          formatted: formatUsAddress(addr, display_name),
          lat: typeof obj.lat === "string" ? obj.lat : null,
          lon: typeof obj.lon === "string" ? obj.lon : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return NextResponse.json(simplified, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

function formatUsAddress(addr: Record<string, unknown> | undefined, fallback: string): string {
  if (!addr) return fallback;
  const num = addr.house_number;
  const road = addr.road;
  const city = addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? addr.municipality;
  const state = addr.state_code ?? addr.state;
  const zip = addr.postcode;
  const parts = [
    [num, road].filter(Boolean).join(" "),
    typeof city === "string" ? city : null,
    [typeof state === "string" ? state : null, typeof zip === "string" ? zip : null]
      .filter(Boolean)
      .join(" "),
  ].filter((p): p is string => !!p && p.length > 0);
  if (parts.length === 0) return fallback;
  return parts.join(", ");
}
