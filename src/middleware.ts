import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = ["/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/uploads")) {
    return NextResponse.next();
  }
  const token = req.cookies.get("cl_session")?.value;
  let ok = false;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret"));
      ok = true;
    } catch {
      ok = false;
    }
  }
  if (PUBLIC.includes(pathname)) {
    if (ok) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
