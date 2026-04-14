import sharp from "sharp";
import exifReader from "exif-reader";

export interface ExifInfo {
  fileName: string;
  timestamp: Date | null;
  exposureCompensation: number | null;
  exposureTime: number | null;
  aperture: number | null;
  iso: number | null;
  focalLength: number | null;
  width: number | null;
  height: number | null;
  make: string | null;
  model: string | null;
}

/**
 * Extract EXIF metadata from an image buffer.
 */
export async function readExif(
  buffer: Buffer,
  fileName: string
): Promise<ExifInfo> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const exif = metadata.exif ? parseExifBuffer(metadata.exif) : null;

    return {
      fileName,
      timestamp: exif?.DateTimeOriginal
        ? exif.DateTimeOriginal instanceof Date
          ? exif.DateTimeOriginal
          : new Date(exif.DateTimeOriginal as string | number)
        : exif?.DateTime
          ? exif.DateTime instanceof Date
            ? exif.DateTime
            : new Date(exif.DateTime as string | number)
          : null,
      exposureCompensation:
        (exif?.ExposureBiasValue as number | undefined) ?? null,
      exposureTime: (exif?.ExposureTime as number | undefined) ?? null,
      aperture: (exif?.FNumber as number | undefined) ?? null,
      iso:
        (exif?.ISOSpeedRatings as number | undefined) ??
        (exif?.ISO as number | undefined) ??
        null,
      focalLength: (exif?.FocalLength as number | undefined) ?? null,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      make: (exif?.Make as string | undefined) ?? null,
      model: (exif?.Model as string | undefined) ?? null,
    };
  } catch (error) {
    console.warn(`Failed to read EXIF for ${fileName}:`, error);
    return {
      fileName,
      timestamp: null,
      exposureCompensation: null,
      exposureTime: null,
      aperture: null,
      iso: null,
      focalLength: null,
      width: null,
      height: null,
      make: null,
      model: null,
    };
  }
}

function parseExifBuffer(
  exifBuffer: Buffer
): Record<string, unknown> | null {
  try {
    const parsed = exifReader(exifBuffer);
    return {
      ...parsed?.Image,
      ...parsed?.Photo,
      ...parsed?.GPSInfo,
    };
  } catch {
    return null;
  }
}
