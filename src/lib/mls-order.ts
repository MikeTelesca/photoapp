// Standard MLS photo order ranking
// Lower number = appears earlier
const MLS_ORDER: Record<string, number> = {
  // Curb appeal first
  "exterior": 10,
  "frontyard": 15,
  "driveway": 18,

  // Entrance
  "foyer": 20,
  "hallway": 25,

  // Main living spaces
  "living-room": 30,
  "dining-room": 40,
  "kitchen": 50,

  // Bedrooms
  "bedroom": 60,

  // Bathrooms
  "bathroom": 70,

  // Office / utility
  "office": 80,
  "garage": 85,
  "basement": 88,

  // Outdoor amenities
  "deck": 90,
  "patio": 92,
  "backyard": 94,
  "pool": 96,

  // Special features
  "fireplace": 50, // group with main spaces
  "view": 95,
  "staircase": 27,

  // Mood/time-of-day
  "twilight": 5, // twilight exteriors lead
  "interior": 100, // generic interior — push later
  "daytime": 100,
};

export function smartSort<T extends { autoTags?: string | null; orderIndex?: number; createdAt?: Date | string }>(photos: T[]): T[] {
  return [...photos].sort((a, b) => {
    const aRank = getRank(a.autoTags);
    const bRank = getRank(b.autoTags);
    if (aRank !== bRank) return aRank - bRank;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });
}

function getRank(autoTags: string | null | undefined): number {
  if (!autoTags) return 999;
  try {
    const tags: string[] = JSON.parse(autoTags);
    if (!Array.isArray(tags)) return 999;
    let best = 999;
    for (const tag of tags) {
      const rank = MLS_ORDER[tag.toLowerCase()];
      if (rank !== undefined && rank < best) best = rank;
    }
    return best;
  } catch {
    return 999;
  }
}
