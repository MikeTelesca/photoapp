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
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role ?? "photographer";
        session.user.id = token.id ?? "";
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
        nextUrl.pathname !== "/api/auth/signup";

      if (isNextAuthRoute) return true;

      // Public health check
      if (nextUrl.pathname === "/api/health") return true;

      // Public signup routes
      if (nextUrl.pathname.startsWith("/signup/")) return true;
      if (nextUrl.pathname === "/api/auth/signup") return true;
      if (nextUrl.pathname.match(/^\/api\/invites\/[^/]+$/) && request.method === "GET") return true;

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
