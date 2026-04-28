import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const protectedPrefixes = ["/canvas", "/library", "/guide", "/challenge"];
      const isProtected = protectedPrefixes.some(
        (p) => pathname === p || pathname.startsWith(p + "/"),
      );

      if (isProtected && !isLoggedIn) {
        // Redirect to sign-in, preserving the intended destination
        const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
        return Response.redirect(new URL(`/signin?callbackUrl=${callbackUrl}`, nextUrl));
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
