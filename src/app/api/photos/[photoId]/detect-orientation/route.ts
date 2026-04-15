import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// EXIF orientation values:
//   1 = normal, 3 = 180°, 6 = rotate 90° CW needed, 8 = rotate 270° CW (90° CCW) needed
function exifOrientationToRotation(orientation: number | undefined): number {
  switch (orientation) {
    case 3:
      return 180;
    case 6:
      return 90;
    case 8:
      return 270;
    default:
      return 0;
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Non-admin users: ensure the photo's job belongs to them
  if (auth.role !== "admin") {
    const job = await prisma.job.findUnique({
      where: { id: photo.jobId },
      select: { photographerId: true },
    });
    if (!job || job.photographerId !== auth.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const sourceUrl = photo.editedUrl || photo.originalUrl;
  if (!sourceUrl) {
    return NextResponse.json({ error: "No image available" }, { status: 400 });
  }

  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
    }
    const buf = Buffer.from(await res.arrayBuffer());

    const sharp = (await import("sharp")).default;
    const metadata = await sharp(buf).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const exifOrientation = metadata.orientation; // 1-8 or undefined

    let suggestedRotation: 0 | 90 | 180 | 270 = 0;
    let confidence = 0;

    // 1) Trust EXIF when present and non-normal
    if (exifOrientation && exifOrientation !== 1) {
      const rot = exifOrientationToRotation(exifOrientation);
      if (rot === 90 || rot === 180 || rot === 270) {
        suggestedRotation = rot;
        confidence = 0.95;
      }
    }

    // Current orientation after any EXIF rotation applied (sharp auto-orient concept):
    //   If EXIF says 6 or 8, the "display" width/height are swapped vs. raw.
    const swapWH = exifOrientation === 6 || exifOrientation === 8;
    const displayWidth = swapWH ? height : width;
    const displayHeight = swapWH ? width : height;
    const currentOrientation: "landscape" | "portrait" =
      displayWidth >= displayHeight ? "landscape" : "portrait";

    // 2) Heuristic: real-estate wide shots are typically landscape.
    //    If no EXIF hint and the image is portrait with an aspect ratio
    //    suspiciously close to a landscape-flipped shot, suggest 90°.
    if (suggestedRotation === 0 && currentOrientation === "portrait" && displayWidth > 0) {
      const aspect = displayHeight / displayWidth; // >1 for portrait
      // Typical real-estate landscape aspects: 3:2 (~1.5), 4:3 (~1.33), 16:9 (~1.78).
      // Portrait images whose *flipped* aspect (w/h of landscape) lands in that band
      // are likely rotated landscape shots.
      if (aspect >= 1.3 && aspect <= 1.9) {
        suggestedRotation = 90;
        confidence = Math.max(confidence, 0.6);
      } else {
        // Still portrait but unusual aspect — lower-confidence suggestion
        suggestedRotation = 90;
        confidence = Math.max(confidence, 0.35);
      }
    }

    return NextResponse.json({
      suggestedRotation,
      currentOrientation,
      confidence,
      width: displayWidth,
      height: displayHeight,
      exifOrientation: exifOrientation ?? null,
    });
  } catch (err: any) {
    console.error("detect-orientation err:", err);
    return NextResponse.json(
      { error: err.message || "Detect failed" },
      { status: 500 }
    );
  }
}
