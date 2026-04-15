/**
 * Twilight/golden hour detection from EXIF dateTimeOriginal.
 * Auto-detects if photos were shot during twilight and suggests seasonalStyle: "twilight".
 */

/**
 * Returns true if the time falls within typical twilight/golden hour for that month.
 * Approximate windows based on Northern hemisphere season:
 * - Summer (May-Aug): 6pm-9pm
 * - Spring/Fall (Mar-Apr, Sep-Oct): 5pm-7pm
 * - Winter (Nov-Feb): 4pm-6pm
 */
export function isTwilightTime(dateTimeOriginal: string | Date): boolean {
  const d = typeof dateTimeOriginal === "string" ? new Date(dateTimeOriginal) : dateTimeOriginal;
  if (isNaN(d.getTime())) return false;

  const hour = d.getHours();
  const minute = d.getMinutes();
  const decimalHour = hour + minute / 60;
  const month = d.getMonth(); // 0-11

  let twilightStart: number;
  let twilightEnd: number;

  if (month >= 4 && month <= 7) {
    // Summer (May-Aug)
    twilightStart = 18; // 6pm
    twilightEnd = 21; // 9pm
  } else if (month === 2 || month === 3 || month === 8 || month === 9) {
    // Spring/fall (Mar-Apr, Sep-Oct)
    twilightStart = 17; // 5pm
    twilightEnd = 19; // 7pm
  } else {
    // Winter (Nov-Feb)
    twilightStart = 16; // 4pm
    twilightEnd = 18; // 6pm
  }

  return decimalHour >= twilightStart && decimalHour <= twilightEnd;
}

/**
 * Returns true if majority of photos (>50%) were shot during twilight.
 * Parses exifData JSON strings looking for dateTimeOriginal or dateTaken fields.
 */
export function detectJobTwilight(exifDataList: Array<string | null | undefined>): boolean {
  if (exifDataList.length === 0) return false;

  let twilightCount = 0;
  let totalChecked = 0;

  for (const exif of exifDataList) {
    if (!exif) continue;
    try {
      const data = JSON.parse(exif);
      // Handle both array of photos and single photo format
      const photos = data?.photos || [data];
      for (const p of photos) {
        const time = p?.dateTimeOriginal || p?.dateTaken;
        if (time) {
          totalChecked++;
          if (isTwilightTime(time)) twilightCount++;
        }
      }
    } catch {
      // Silently skip malformed EXIF data
    }
  }

  if (totalChecked === 0) return false;
  return twilightCount / totalChecked > 0.5; // >50% of photos in twilight window
}
