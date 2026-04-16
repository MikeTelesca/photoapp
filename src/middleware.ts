import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Use the edge-compatible auth config (no Prisma)
export default NextAuth(authConfig).auth;

export const config = {
  // Exclude static assets AND the service worker + its manifest — these must
  // load unauthenticated or the PWA can never update from a stale cache.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon-\\d+\\.png|icons/).*)",
  ],
};
