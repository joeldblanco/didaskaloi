import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Public paths that don't require authentication
  const isAuthPage = pathname.startsWith("/auth");
  const isApiRoute = pathname.startsWith("/api/");
  const isOfflinePage = pathname.startsWith("/_offline");

  // Always allow offline fallback page
  if (isOfflinePage) {
    return NextResponse.next();
  }

  // API routes handle their own authentication (Bearer token)
  if (isApiRoute) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/proyectos", req.url));
  }

  // Redirect non-logged-in users to login
  if (!isLoggedIn && !isAuthPage) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(
      new URL(`/auth/login?callbackUrl=${callbackUrl}`, req.url)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - sw.js, workbox-*.js (service worker files)
     * - public files (images)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw\\.js|workbox-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
