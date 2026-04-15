import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

function num(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatShutter(exposureTime: number | null): string | null {
  if (exposureTime === null) return null;
  if (exposureTime >= 1) return `${exposureTime}s`;
  const denom = Math.round(1 / exposureTime);
  return `1/${denom}s`;
}

export async function GET(
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

  const sourceUrl = photo.originalUrl;
  if (!sourceUrl) {
    return NextResponse.json({ error: "No original image available" }, { status: 400 });
  }

  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
    }
    const buf = Buffer.from(await res.arrayBuffer());

    const sharp = (await import("sharp")).default;
    const metadata = await sharp(buf).metadata();

    const image = {
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      format: metadata.format ?? null,
      space: metadata.space ?? null,
      channels: metadata.channels ?? null,
      depth: metadata.depth ?? null,
      density: metadata.density ?? null,
      orientation: metadata.orientation ?? null,
      hasAlpha: metadata.hasAlpha ?? null,
      hasProfile: metadata.hasProfile ?? null,
      size: buf.byteLength,
      megapixels:
        metadata.width && metadata.height
          ? Number(((metadata.width * metadata.height) / 1_000_000).toFixed(2))
          : null,
    };

    // Parse EXIF via exifr — pull from the fetched bytes directly so we also
    // get GPS and maker-specific tags that sharp doesn't expose.
    let exif: any = {};
    try {
      const exifr = (await import("exifr")).default;
      const exifrOpts: unknown = {
        tiff: true,
        exif: true,
        gps: true,
        ifd0: true,
        ifd1: false,
        interop: false,
        xmp: false,
        icc: false,
        iptc: false,
        jfif: false,
        ihdr: false,
        makerNote: false,
        userComment: false,
        translateKeys: true,
        translateValues: true,
        reviveValues: true,
      };
      exif =
        (await exifr.parse(
          buf,
          exifrOpts as Parameters<typeof exifr.parse>[1],
        )) || {};
    } catch {
      exif = {};
    }

    const iso = num(exif.ISO ?? exif.ISOSpeedRatings ?? exif.PhotographicSensitivity);
    const fNumber = num(exif.FNumber ?? exif.ApertureValue);
    const exposureTime = num(exif.ExposureTime);
    const focalLength = num(exif.FocalLength);
    const focalLength35 = num(exif.FocalLengthIn35mmFormat);
    const exposureBias = num(exif.ExposureBiasValue ?? exif.ExposureCompensation);

    const camera = {
      make: exif.Make ?? null,
      model: exif.Model ?? null,
      lens: exif.LensModel ?? exif.Lens ?? exif.LensMake ?? null,
      software: exif.Software ?? null,
      serial: exif.BodySerialNumber ?? exif.SerialNumber ?? null,
    };

    const exposure = {
      iso,
      fNumber,
      aperture: fNumber !== null ? `f/${fNumber}` : null,
      exposureTime,
      shutter: formatShutter(exposureTime),
      focalLength,
      focalLengthMm: focalLength !== null ? `${focalLength}mm` : null,
      focalLength35mm: focalLength35,
      exposureBias,
      exposureProgram: exif.ExposureProgram ?? null,
      meteringMode: exif.MeteringMode ?? null,
      flash: exif.Flash ?? null,
      whiteBalance: exif.WhiteBalance ?? null,
      dateTaken:
        exif.DateTimeOriginal instanceof Date
          ? exif.DateTimeOriginal.toISOString()
          : exif.DateTimeOriginal ?? exif.CreateDate ?? exif.DateTime ?? null,
    };

    const lat = num(exif.latitude ?? exif.GPSLatitude);
    const lng = num(exif.longitude ?? exif.GPSLongitude);
    const location =
      lat !== null && lng !== null
        ? {
            latitude: lat,
            longitude: lng,
            altitude: num(exif.GPSAltitude),
            mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
          }
        : null;

    return NextResponse.json({
      photoId,
      image,
      camera,
      exposure,
      location,
    });
  } catch (err: any) {
    console.error("exif route err:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to read EXIF" },
      { status: 500 }
    );
  }
}
