// Bracket grouping from a list of Dropbox-hosted image files.
//
// Strategy:
//   1. Fetch the first 128KB of each file (enough for EXIF) via Dropbox
//      temp-link + Range header.
//   2. Parse EXIF with `exifr` (handles DNG/CR2/ARW unlike sharp).
//   3. Feed the results to groupBrackets(), which clusters photos shot
//      within 10s of each other sharing aperture/focal length. Single
//      shots (drone photos, single exteriors) land in their own 1-photo
//      groups automatically.
//
// Falls back to naive sequential grouping if EXIF extraction fails or
// all timestamps are missing.

import exifr from "exifr";
import { getTemporaryLink } from "./dropbox";
import { groupBrackets, type BracketGroup } from "./bracket-grouping";
import type { ExifInfo } from "./exif";
import { log } from "./logger";

export type DropboxImageFile = {
  name: string;
  path: string;
  size?: number;
};

const EXIF_HEAD_BYTES = 131_072; // 128KB — enough for full EXIF on any camera
const CONCURRENCY = 8; // max parallel EXIF fetches

export async function groupFilesByExif(
  files: DropboxImageFile[],
): Promise<BracketGroup[]> {
  if (files.length === 0) return [];

  const exifs: ExifInfo[] = [];
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < files.length) {
      const idx = cursor;
      cursor += 1;
      const f = files[idx];
      exifs[idx] = await readExifFromDropbox(f);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => worker()),
  );

  const groups = groupBrackets(exifs);
  log.info("bracket.grouped", {
    total: files.length,
    groups: groups.length,
    sizes: groups.map((g) => g.photos.length),
  });
  return groups;
}

async function readExifFromDropbox(file: DropboxImageFile): Promise<ExifInfo> {
  const empty = (): ExifInfo => ({
    fileName: file.name,
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
  });

  try {
    const link = await getTemporaryLink(file.path);
    const res = await fetch(link, {
      headers: { Range: `bytes=0-${EXIF_HEAD_BYTES - 1}` },
    });
    if (!res.ok && res.status !== 206) {
      throw new Error(`HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());

    const parsed = (await exifr.parse(buf, {
      pick: [
        "DateTimeOriginal",
        "CreateDate",
        "ExposureBiasValue",
        "ExposureTime",
        "FNumber",
        "ISO",
        "FocalLength",
        "Make",
        "Model",
      ],
    })) as Record<string, unknown> | undefined;

    if (!parsed) return empty();

    const dt = parsed.DateTimeOriginal ?? parsed.CreateDate;
    return {
      fileName: file.name,
      timestamp: dt instanceof Date ? dt : dt ? new Date(dt as string | number) : null,
      exposureCompensation: typeof parsed.ExposureBiasValue === "number" ? parsed.ExposureBiasValue : null,
      exposureTime: typeof parsed.ExposureTime === "number" ? parsed.ExposureTime : null,
      aperture: typeof parsed.FNumber === "number" ? parsed.FNumber : null,
      iso: typeof parsed.ISO === "number" ? parsed.ISO : null,
      focalLength: typeof parsed.FocalLength === "number" ? parsed.FocalLength : null,
      width: null,
      height: null,
      make: typeof parsed.Make === "string" ? parsed.Make : null,
      model: typeof parsed.Model === "string" ? parsed.Model : null,
    };
  } catch (err: unknown) {
    log.warn("exif.read_failed", {
      path: file.path,
      err: err instanceof Error ? err.message : String(err),
    });
    return empty();
  }
}
