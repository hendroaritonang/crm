import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

const PROTECTED = ["/", "/pelanggan", "/ip", "/mrtg", "/tiket", "/billing", "/audit", "/users", "/password", "/paket", "/perangkat"];

export function middleware(req: import("next/server").NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected =
    PROTECTED.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p))) &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/");
  if (!isProtected) return NextResponse.next();
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/pelanggan/:path*", "/ip/:path*", "/mrtg/:path*", "/tiket/:path*", "/billing/:path*", "/audit/:path*", "/users/:path*", "/password/:path*", "/paket/:path*", "/perangkat/:path*"],
};
