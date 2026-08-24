import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Redirects only. This is an optimistic check — the cookie's presence says nothing
 * about whether the session is still valid, so it is not a security boundary. Every
 * dashboard page re-verifies the session and its own permission on the server.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/auth/")) {
    return withSingleOrigin(request);
  }
  // Only the negative direction is safe to decide here. A cookie's *absence* proves the
  // user cannot be signed in, but its presence proves nothing — it may be expired or
  // signed with an old secret. Bouncing /login to /dashboard on presence alone deadlocks
  // against the dashboard's real session check, so that direction lives on the login page.
  if (getSessionCookie(request) === null) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

function withSingleOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !origin.includes(",")) return NextResponse.next();

  const values = [...new Set(origin.split(",").map((value) => value.trim()))];
  if (values.length !== 1) return NextResponse.next();

  const headers = new Headers(request.headers);
  headers.set("origin", values[0]!);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/auth/:path*"],
};
