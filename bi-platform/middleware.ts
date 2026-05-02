import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const role = req.cookies.get("role")?.value;
  const url = req.nextUrl.clone();

  // ← exclude /login and /auth from redirect
  if (
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/reset-password")
  ) {
    return NextResponse.next();
  }

  // no token → redirect to login
  if (!token) {
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // role protection
  if (url.pathname.startsWith("/directeur") && role !== "directeur") {
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  if (
    url.pathname.startsWith("/respédagogique") &&
    role !== "resp_pedagogique"
  ) {
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  if (url.pathname.startsWith("/admin") && role !== "admin") {
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"],
};
