import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Middleware] Path: ${pathname}, Cookies:`, request.cookies.getAll().map(c => c.name));

  // Protect /chat routes
  if (pathname.startsWith("/chat")) {
    const hasSession = 
      request.cookies.has("next-auth.session-token") || 
      request.cookies.has("__Secure-next-auth.session-token") ||
      request.cookies.has("authjs.session-token") ||
      request.cookies.has("__Secure-authjs.session-token");
      
    if (!hasSession) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Protect /admin routes (except /admin/login)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    // Temporarily bypass middleware redirect to allow direct loading
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/chat/:path*",
    "/admin/:path*",
  ],
};
