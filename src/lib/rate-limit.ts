// Simple in-memory rate limiter. Resets on cold start (fine for Vercel).
// For prod at scale, swap to Redis/Upstash. This is a good starting point.

interface Bucket { count: number; resetAt: number; }
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function rateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(opts.key);

  if (!existing || existing.resetAt < now) {
    const bucket = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(opts.key, bucket);
    return { allowed: true, limit: opts.limit, remaining: opts.limit - 1, resetAt: bucket.resetAt };
  }

  if (existing.count >= opts.limit) {
    return { allowed: false, limit: opts.limit, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, limit: opts.limit, remaining: opts.limit - existing.count, resetAt: existing.resetAt };
}

// Cleanup old buckets periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }, 10 * 60 * 1000); // every 10 min
}

// Convenience helper that creates a NextResponse 429 when exceeded
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function rejectResponse(limit: number, resetAt: number, reason = "Rate limit exceeded"): NextResponse {
  return NextResponse.json(
    { error: reason, resetAt: new Date(resetAt).toISOString() },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.floor(resetAt / 1000)),
        "Retry-After": String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))),
      },
    }
  );
}

export async function checkRate(
  userId: string,
  bucket: "enhance" | "ai-lite" | "default"
): Promise<NextResponse | null> {
  const configs = {
    enhance: { limit: 120, windowMs: 60 * 60 * 1000 },  // 120/hour
    "ai-lite": { limit: 30, windowMs: 60 * 60 * 1000 }, // 30/hour
    default: { limit: 300, windowMs: 60 * 60 * 1000 },  // 300/hour
  };

  // Look up user tier; fall back to "standard" on any error
  let tier: string = "standard";
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { rateLimitTier: true },
    });
    if (user?.rateLimitTier) tier = user.rateLimitTier;
  } catch {
    tier = "standard";
  }

  // Banned users are always rejected
  if (tier === "banned") {
    const resetAt = Date.now() + 60 * 60 * 1000;
    return rejectResponse(0, resetAt, "Account rate-limited by administrator");
  }

  // Unlimited users skip the check entirely
  if (tier === "unlimited") {
    return null;
  }

  const baseCfg = configs[bucket];
  const multiplier = tier === "pro" ? 2 : 1;
  const cfg = { limit: baseCfg.limit * multiplier, windowMs: baseCfg.windowMs };
  const result = rateLimit({ key: `${bucket}:${tier}:${userId}`, ...cfg });

  if (!result.allowed) {
    return rejectResponse(result.limit, result.resetAt);
  }

  return null; // allowed
}
