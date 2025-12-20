/**
 * Authentication Proxy
 *
 * BEST PRACTICE (Next.js 16): Proxy only checks cookie existence (fast, optimistic)
 * Full session validation happens at page/route level for security
 *
 * Note: In Next.js 16, middleware.ts was renamed to proxy.ts
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Routes that require authentication
const protectedRoutes = [
  "/hr",
  "/candidate",
  "/interview",
  "/select-organization",
];

// Public routes that don't need auth
const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/employers",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip for public routes
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if route needs protection
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // IMPORTANT: This only checks cookie existence, NOT validity
  // Real validation happens in pages/API routes via requireAuth()
  // Organization check also happens at page level (session.activeOrganizationId)
  // Note: Cookie has __Secure- prefix in production (HTTPS)
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");
  if (!sessionCookie) {
    // Redirect to login with callback URL
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately by route handlers)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
};
