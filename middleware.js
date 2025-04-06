import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Add any paths that should be accessible without authentication
const PUBLIC_PATHS = [
  "/signin",
  "/register",
  "/api/auth/signin",
  "/api/auth/signin/verify",
  "/api/auth/register",
  "/api/auth/verify",
  "/api/auth/me",
  "/chat",
  "/api/chat",
  "/api/schedule/availableSlots",
  "/api/schedule/availableSlots/earliest",
];

// Add paths that should redirect to dashboard if user is authenticated
const AUTH_PATHS = ["/signin", "/register"];

// Convert string to Uint8Array for jose
const getSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return new TextEncoder().encode(secret);
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public files
  if (pathname.startsWith("/_next") || pathname.startsWith("/static")) {
    return NextResponse.next();
  }

  // Skip middleware for public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    console.log("Middleware - Skipping public path:", pathname);
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get("token")?.value;
  console.log("Middleware - Processing request:", {
    pathname,
    hasToken: !!token,
  });

  // If no token and trying to access protected route
  if (!token) {
    // If accessing protected route, redirect to signin
    if (!PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
      console.log("Middleware - No token, redirecting to signin");
      const url = new URL("/signin", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  try {
    // Verify token
    const { payload } = await jwtVerify(token, getSecretKey());
    console.log("Middleware - Token verification result:", { payload });

    // If token is invalid, redirect to signin
    if (!payload) {
      console.log("Middleware - Invalid token, redirecting to signin");
      const url = new URL("/signin", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // If token is valid and user tries to access auth pages, redirect to dashboard
    if (AUTH_PATHS.some((path) => pathname.startsWith(path))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Add user info to headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.userId);
    requestHeaders.set("x-user-email", payload.email);

    // Return response with modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    // If token is invalid, clear it and redirect to signin
    const response = NextResponse.redirect(new URL("/signin", request.url));
    response.cookies.set({
      name: "token",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
    return response;
  }
}

// Configure matcher for middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/auth/* (authentication routes)
     * 2. /_next/* (Next.js internals)
     * 3. /static/* (static files)
     * 4. /favicon.ico, /robots.txt, etc.
     */
    "/((?!api/auth/.*|_next/.*|favicon.ico|robots.txt).*)",
  ],
};
