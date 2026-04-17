import { ExifInfo } from "./exif";

export interface BracketGroup {
  groupIndex: number;
  photos: ExifInfo[];
  bracketCount: number; // 3 or 5
  avgTimestamp: Date | null;
}

/**
 * Group photos into bracket sets based on EXIF metadata.
 *
 * Strategy:
 * 1. Sort by timestamp
 * 2. Group photos taken within MAX_GAP_SECONDS of each other
 * 3. Within each time cluster, verify exposure differences
 * 4. Split/merge groups to target bracket counts of 3 or 5
 */
export function groupBrackets(
  photos: ExifInfo[],
  expectedBracketCount?: 3 | 5
): BracketGroup[] {
  if (photos.length === 0) return [];

  // Sort by timestamp, then by filename for photos without timestamps
  const sorted = [...photos].sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return a.timestamp.getTime() - b.timestamp.getTime();
    }
    if (a.timestamp) return -1;
    if (b.timestamp) return 1;
    return a.fileName.localeCompare(b.fileName);
  });

  // Resolve the bracket count to split by. If the caller didn't specify,
  // detect from ExposureBiasValue distribution across the set.
  const targetCount = expectedBracketCount ?? detectBracketCount(sorted);

  // If we have timestamps, group by time proximity then split oversized
  // clusters to the detected count. Clusters smaller than targetCount
  // (drones, standalones) pass through as single-photo groups.
  if (sorted[0]?.timestamp) {
    return groupByTimestamp(sorted, targetCount);
  }

  // Fallback: group by filename order with the detected/expected count.
  return groupBySequence(sorted, targetCount);
}

// Brackets are fired in continuous burst mode — the gap between shots within
// a bracket is sub-second on most cameras. 3s is a generous ceiling that
// still separates distinct brackets of the same scene taken moments apart.
const MAX_GAP_SECONDS = 3;

function groupByTimestamp(
  photos: ExifInfo[],
  expectedCount: 3 | 5
): BracketGroup[] {
  const groups: BracketGroup[] = [];
  let currentGroup: ExifInfo[] = [photos[0]];

  for (let i = 1; i < photos.length; i++) {
    const prev = photos[i - 1];
    const curr = photos[i];

    const prevTime = prev.timestamp?.getTime() || 0;
    const currTime = curr.timestamp?.getTime() || 0;
    const gapSeconds = (currTime - prevTime) / 1000;

    // Check if this photo belongs to the current group
    const sameAperture =
      prev.aperture === null ||
      curr.aperture === null ||
      Math.abs((prev.aperture || 0) - (curr.aperture || 0)) < 0.1;

    const sameFocal =
      prev.focalLength === null ||
      curr.focalLength === null ||
      Math.abs((prev.focalLength || 0) - (curr.focalLength || 0)) < 1;

    // Hard ceiling: a single group can never exceed the detected bracket
    // count. Prevents runs of the same aperture/focal taken within the gap
    // window from merging into mega-groups.
    const atCeiling = currentGroup.length >= expectedCount;

    if (!atCeiling && gapSeconds <= MAX_GAP_SECONDS && sameAperture && sameFocal) {
      currentGroup.push(curr);
    } else {
      // Finalize current group
      groups.push(makeGroup(groups.length, currentGroup));
      currentGroup = [curr];
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    groups.push(makeGroup(groups.length, currentGroup));
  }

  // Final safety split (e.g. when expectedCount was guessed wrong).
  return splitGroups(groups, expectedCount);
}

function groupBySequence(
  photos: ExifInfo[],
  bracketCount: number
): BracketGroup[] {
  const groups: BracketGroup[] = [];

  for (let i = 0; i < photos.length; i += bracketCount) {
    const slice = photos.slice(i, i + bracketCount);
    groups.push(makeGroup(groups.length, slice));
  }

  return groups;
}

function splitGroups(
  groups: BracketGroup[],
  expectedCount: number
): BracketGroup[] {
  const result: BracketGroup[] = [];

  for (const group of groups) {
    if (group.photos.length === expectedCount) {
      result.push({ ...group, groupIndex: result.length });
    } else if (group.photos.length > expectedCount) {
      // Split into chunks of expectedCount
      for (let i = 0; i < group.photos.length; i += expectedCount) {
        const chunk = group.photos.slice(i, i + expectedCount);
        result.push(makeGroup(result.length, chunk));
      }
    } else {
      // Undersized group — keep as-is (might be last set with fewer photos)
      result.push({ ...group, groupIndex: result.length });
    }
  }

  return result;
}

function makeGroup(index: number, photos: ExifInfo[]): BracketGroup {
  const timestamps = photos
    .filter((p) => p.timestamp)
    .map((p) => p.timestamp!.getTime());

  const avgTimestamp =
    timestamps.length > 0
      ? new Date(timestamps.reduce((a, b) => a + b, 0) / timestamps.length)
      : null;

  return {
    groupIndex: index,
    photos,
    bracketCount: photos.length,
    avgTimestamp,
  };
}

/**
 * Detect the likely bracket count from a set of photos.
 * Analyzes exposure compensation patterns to determine if 3 or 5 brackets were used.
 */
export function detectBracketCount(photos: ExifInfo[]): 3 | 5 {
  // Count unique exposure compensation values
  const evValues = new Set(
    photos
      .filter((p) => p.exposureCompensation !== null)
      .map((p) => p.exposureCompensation!)
  );

  if (evValues.size >= 5) return 5;
  if (evValues.size >= 3) return 3;

  // Fallback: check if total count is divisible by 5 or 3
  if (photos.length % 5 === 0) return 5;
  return 3;
}
