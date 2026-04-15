import { prisma } from "@/lib/db";

// Known flag keys (add as you go)
export const FLAG_KEYS = [
  "ai-crop",
  "slideshow",
  "playground",
  "advanced-search",
  "photo-comments",
  "ai-preset-suggest",
] as const;

export type FlagKey = (typeof FLAG_KEYS)[number];

// In-memory cache (refreshed every 60s)
const cache = new Map<string, boolean>();
let cacheExpiry = 0;

async function loadFlags() {
  if (Date.now() < cacheExpiry) return;
  try {
    const flags = await prisma.featureFlag.findMany();
    cache.clear();
    flags.forEach((f) => cache.set(f.key, f.enabled));
    cacheExpiry = Date.now() + 60000;
  } catch {
    // Table may not exist yet — use defaults
  }
}

export async function isFlagEnabled(key: string): Promise<boolean> {
  await loadFlags();
  return cache.get(key) ?? true; // default to enabled (opt-out model)
}

export async function getAllFlags(): Promise<Record<string, boolean>> {
  await loadFlags();
  const result: Record<string, boolean> = {};
  FLAG_KEYS.forEach((k) => {
    result[k] = cache.get(k) ?? true;
  });
  return result;
}
