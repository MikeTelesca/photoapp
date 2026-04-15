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

export function checkRate(userId: string, bucket: "enhance" | "ai-lite" | "default"): NextResponse | null {
  const configs = {
    enhance: { limit: 120, windowMs: 60 * 60 * 1000 },  // 120/hour
    "ai-lite": { limit: 30, windowMs: 60 * 60 * 1000 }, // 30/hour
    default: { limit: 300, windowMs: 60 * 60 * 1000 },  // 300/hour
  };
  const cfg = configs[bucket];
  const result = rateLimit({ key: `${bucket}:${userId}`, ...cfg });

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: new Date(result.resetAt).toISOString() },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  return null; // allowed
}
