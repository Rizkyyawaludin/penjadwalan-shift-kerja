import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = process.env.JWT_SECRET || "default_super_secret_key_change_me_in_production";
const encodedKey = new TextEncoder().encode(SECRET_KEY);

// Define paths that do not require authentication
const publicPaths = ["/login", "/api/public"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to public paths and static files
  if (
    publicPaths.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.includes(".") // like favicon.ico, images, etc.
  ) {
    return NextResponse.next();
  }

  // Get the token from cookies
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    // No token found, redirect to login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify the token
    await jwtVerify(token, encodedKey);
    return NextResponse.next();
  } catch (error) {
    // Token is invalid or expired
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
