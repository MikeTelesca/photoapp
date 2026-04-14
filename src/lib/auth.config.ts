import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config (no Prisma imports)
// Used by middleware for session checking
export const authConfig = {
  providers: [], // Providers added in auth.ts (they need Prisma)
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/login");
      const isApiRoute = nextUrl.pathname.startsWith("/api");

      if (isApiRoute) return true;

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
  secret: process.env.NEXTAUTH_SECRET || "photoapp-secret-change-in-production",
} satisfies NextAuthConfig;
