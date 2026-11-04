// src/proxy.js
/**
 * Next.js 16 proxy (formerly middleware). A fast first check only: if there is no
 * session cookie, send the visitor to /login before rendering protected pages.
 * The real checks (valid session, admin role, blocked users) happen on the server
 * in src/server/session.js (requireUser / requireAdmin).
 */
import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request) {
    if (!getSessionCookie(request)) {
        const url = new URL("/login", request.url);
        url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
        return NextResponse.redirect(url);
    }
    return NextResponse.next();
}

export const config = {
    matcher: ["/account/:path*", "/admin/:path*"],
};