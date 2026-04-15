import type { NextAuthConfig } from "next-auth";

// Security: Ensure NEXTAUTH_SECRET is set at module load time
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET environment variable must be set");
}

// Edge-compatible auth config (no Prisma imports)
// Used by middleware for session checking
export const authConfig = {
  providers: [], // Providers added in auth.ts (they need Prisma)
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      // Handle impersonation: only admins can set impersonatedUserId
      if (trigger === "update" && session?.impersonatedUserId !== undefined) {
        if (token.role === "admin") {
          token.impersonatedUserId = session.impersonatedUserId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.impersonatedUserId) {
          // Swap the user ID to the impersonated user
          session.user.id = token.impersonatedUserId as string;
          session.impersonating = true;
          session.realUserId = token.sub;
          // Don't expose role during impersonation (behave as photographer)
          session.user.role = "photographer";
        } else {
          session.user.role = token.role ?? "photographer";
          session.user.id = token.id ?? "";
        }
      }
      return session;
    },
    authorized({ auth, request }) {
      const nextUrl = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/login");
      // NextAuth's own endpoints handle their own auth flow
      const isNextAuthRoute = nextUrl.pathname.startsWith("/api/auth/") &&
        !nextUrl.pathname.startsWith("/api/auth/dropbox") &&
        nextUrl.pathname !== "/api/auth/signup" &&
        nextUrl.pathname !== "/api/auth/forgot" &&
        nextUrl.pathname !== "/api/auth/reset";

      if (isNextAuthRoute) return true;

      // Public health check
      if (nextUrl.pathname === "/api/health") return true;

      // Public marketing landing page (no auth required)
      if (nextUrl.pathname === "/") return true;

      // Public status endpoint and page (no auth required)
      if (nextUrl.pathname === "/api/public/status") return true;
      if (nextUrl.pathname === "/status") return true;

      // Public maintenance page (no auth required)
      if (nextUrl.pathname === "/maintenance") return true;

      // Public share routes (tokenized client gallery)
      if (nextUrl.pathname.startsWith("/share/")) return true;

      // Public signup routes
      if (nextUrl.pathname.startsWith("/signup/")) return true;
      if (nextUrl.pathname === "/api/auth/signup") return true;
      if (nextUrl.pathname.match(/^\/api\/invites\/[^/]+$/) && request.method === "GET") return true;

      // Public password reset routes
      if (nextUrl.pathname === "/api/auth/forgot") return true;
      if (nextUrl.pathname === "/api/auth/reset") return true;
      if (nextUrl.pathname === "/forgot") return true;
      if (nextUrl.pathname === "/reset") return true;

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      return isLoggedIn; // Redirect to login if not authenticated
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
