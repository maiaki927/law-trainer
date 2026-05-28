import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const protectedPaths = ["/me", "/admin", "/api/attempts"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isProtected = protectedPaths.some((p) =>
    nextUrl.pathname.startsWith(p)
  );

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    nextUrl.pathname.startsWith("/admin") &&
    req.auth?.user?.role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/me/:path*", "/admin/:path*", "/api/attempts/:path*"],
};
