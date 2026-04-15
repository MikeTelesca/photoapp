import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { applyPattern } from "@/lib/filename-pattern";
import { logDownload } from "@/lib/download-log";

export const runtime = "nodejs";

// Image extensions considered "valid" for preserving from the source URL
const KNOWN_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "tif",
  "tiff",
  "dng",
  "cr2",
  "cr3",
  "arw",
  "nef",
  "raf",
  "webp",
  "heic",
  "heif",
];

function sanitizeBaseName(raw: string): string {
  let s = (raw || "").normalize("NFC");
  s = s.replace(/[\\/:*?"<>|\x00-\x1f]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^\.+|\.+$/g, "").trim();
  if (s.length > 180) s = s.slice(0, 180);
  return s;
}

function extFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const pathname = u.pathname;
    const dot = pathname.lastIndexOf(".");
    if (dot === -1) return null;
    const ext = pathname.slice(dot + 1).toLowerCase();
    // Strip any querystring-like trailing characters
    const clean = ext.replace(/[^a-z0-9]/g, "");
    if (KNOWN_EXTENSIONS.includes(clean)) return clean;
    return null;
  } catch {
    return null;
  }
}

function contentTypeForExt(ext: string): string {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "tif":
    case "tiff":
      return "image/tiff";
    case "webp":
      return "image/webp";
    case "heic":
    case "heif":
      return "image/heic";
    default:
      return "application/octet-stream";
  }
}

function isDropboxShareUrl(url: string): boolean {
  return /^https?:\/\/(?:www\.)?dropbox\.com\//i.test(url);
}

// GET /api/photos/:photoId/download?variant=edited|original
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const variantParam = (searchParams.get("variant") || "edited").toLowerCase();
  if (variantParam !== "edited" && variantParam !== "original") {
    return NextResponse.json(
      { error: "variant must be 'edited' or 'original'" },
      { status: 400 }
    );
  }

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: {
      job: {
        include: {
          photographer: {
            select: {
              id: true,
              name: true,
              filenamePattern: true,
            },
          },
        },
      },
    },
  });

  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Job ownership check (non-admin)
  if (auth.role !== "admin" && photo.job.photographerId !== auth.userId) {
    // 404 to prevent ID enumeration
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sourceUrl =
    variantParam === "edited" ? photo.editedUrl : photo.originalUrl;

  if (!sourceUrl) {
    return NextResponse.json(
      {
        error:
          variantParam === "edited"
            ? "No edited photo available"
            : "No original photo available",
      },
      { status: 400 }
    );
  }

  try {
    let buffer: Buffer;

    if (sourceUrl.startsWith("data:")) {
      const base64Data = sourceUrl.split(",")[1];
      if (!base64Data) {
        return NextResponse.json(
          { error: "Invalid photo data" },
          { status: 500 }
        );
      }
      buffer = Buffer.from(base64Data, "base64");
    } else if (sourceUrl.startsWith("http")) {
      if (isDropboxShareUrl(sourceUrl)) {
        try {
          // For Dropbox shared links, try direct fetch first (faster), fall
          // back to the SDK helper if the direct fetch yields HTML/empty.
          // Many Dropbox share URLs already have dl=1 and fetch cleanly.
          const res = await fetch(sourceUrl);
          const ct = res.headers.get("content-type") || "";
          if (res.ok && !ct.includes("text/html")) {
            buffer = Buffer.from(await res.arrayBuffer());
          } else {
            // Fall back to SDK path (requires the file path — not known here),
            // so as a simpler fallback, force dl=1 and refetch.
            const withDl = sourceUrl.includes("dl=")
              ? sourceUrl.replace(/dl=0/, "dl=1")
              : sourceUrl + (sourceUrl.includes("?") ? "&" : "?") + "dl=1";
            const res2 = await fetch(withDl);
            buffer = Buffer.from(await res2.arrayBuffer());
          }
        } catch {
          // Last resort — the helper requires a path; without one, rethrow
          // by using downloadFileFromSharedLink with empty path may fail.
          // We use a direct-forced dl=1 fetch as a best effort.
          const withDl = sourceUrl.includes("dl=")
            ? sourceUrl.replace(/dl=0/, "dl=1")
            : sourceUrl + (sourceUrl.includes("?") ? "&" : "?") + "dl=1";
          const res2 = await fetch(withDl);
          buffer = Buffer.from(await res2.arrayBuffer());
        }
      } else {
        const res = await fetch(sourceUrl);
        if (!res.ok) {
          return NextResponse.json(
            { error: `Failed to fetch photo (${res.status})` },
            { status: 502 }
          );
        }
        buffer = Buffer.from(await res.arrayBuffer());
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported photo URL" },
        { status: 500 }
      );
    }

    // Determine extension
    const urlExt = extFromUrl(sourceUrl) || "jpg";

    // Determine filename base
    let base: string | null = null;
    if (photo.customFilename) {
      base = sanitizeBaseName(photo.customFilename);
    }

    if (!base) {
      const user = photo.job.photographer;
      const pattern = user?.filenamePattern || "{address}-{seq}";
      // applyPattern appends .jpg — strip it to use our own extension
      const patterned = applyPattern({
        pattern,
        address: photo.job.address,
        client: photo.job.clientName || "",
        preset: photo.job.preset || "",
        photographer: user?.name || "",
        index: photo.orderIndex + 1,
        total: 1,
      }).replace(/\.jpg$/i, "");
      base = sanitizeBaseName(patterned) || "photo";
    }

    const suffix = variantParam === "original" ? "-original" : "";
    const filename = `${base}${suffix}.${urlExt}`;

    // Best-effort download log
    await logDownload({
      userId: auth.userId,
      jobId: photo.jobId,
      photoId: photo.id,
      type: "single",
      preset: variantParam,
    }).catch(() => {});

    // RFC 5987 encoding for non-ASCII support
    const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");
    const encoded = encodeURIComponent(filename);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentTypeForExt(urlExt),
        "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err: any) {
    console.error("[photo download] error:", err);
    return NextResponse.json(
      { error: err?.message || "Download failed" },
      { status: 500 }
    );
  }
}
