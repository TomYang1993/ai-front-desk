import { NextResponse, type NextRequest } from "next/server";
import { homeFor, SESSION_COOKIE, verifySession } from "@/lib/session-token";

/**
 * Sends people to the right place before a page renders: signed-out
 * visitors to /signin, parents to their front desk, directors to the
 * console. API routes check the session themselves.
 */
const PUBLIC = ["/signin", "/status"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!session) {
    if (isPublic) return NextResponse.next();
    const response = NextResponse.redirect(new URL("/signin", request.nextUrl));
    // Clear a tampered or expired cookie so it isn't checked again.
    if (request.cookies.has(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const home = homeFor(session);
  if (pathname === "/signin") return NextResponse.redirect(new URL(home, request.nextUrl));
  const isConsole = pathname === "/console" || pathname.startsWith("/console/");
  if (session.role === "parent" && isConsole) return NextResponse.redirect(new URL(home, request.nextUrl));
  if (session.role === "director" && !isConsole && !isPublic) return NextResponse.redirect(new URL(home, request.nextUrl));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)"],
};
