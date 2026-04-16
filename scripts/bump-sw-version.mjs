#!/usr/bin/env node
// Substitutes __BUILD_ID__ in public/sw.js with a unique per-build id
// so every deploy gets a fresh cache name and old caches are purged.
// Runs as a prebuild hook.

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const swPath = resolve(__dirname, "..", "public", "sw.js");

let sha = "local";
try {
  sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
} catch {
  // fall through
}
// Vercel exposes VERCEL_GIT_COMMIT_SHA when building on their infra
if (process.env.VERCEL_GIT_COMMIT_SHA) {
  sha = process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
}

const buildId = `${Date.now()}-${sha}`;

const src = readFileSync(swPath, "utf8");
// Replace on the template; if already substituted (rebuild in same tree), replace
// whatever batchbase-... token is on the CACHE_VERSION line.
const next = src.replace(
  /const CACHE_VERSION = 'batchbase-[^']+';/,
  `const CACHE_VERSION = 'batchbase-${buildId}';`,
);

if (next === src) {
  console.warn("[bump-sw-version] CACHE_VERSION line not found; sw.js unchanged");
} else {
  writeFileSync(swPath, next);
  console.log(`[bump-sw-version] CACHE_VERSION = batchbase-${buildId}`);
}
