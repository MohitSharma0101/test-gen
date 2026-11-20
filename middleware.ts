// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_TOKEN_KEY } from "./lib/api";
import { verifyToken } from "./lib/tokenUtils";

// API routes reachable without a session. Everything else under /api needs a
// valid token (BUGS.md #1: a missing token used to be let through, which left
// 27 routes open, including account creation and role changes).
const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/logout",
  // Keep-warm ping: no data
  "/api/health",
];
// Server-to-server job slices authenticate with their own secret header, and
// the nightly AI runner with its key (each route checks it: lib/aiRequests.ts)
const isJobRun = (pathname: string) =>
  /^\/api\/jobs\/[^/]+\/run$/.test(pathname) || pathname.startsWith("/api/ai-runner/");

const tokenFrom = (req: NextRequest) =>
  req.cookies.get(AUTH_TOKEN_KEY)?.value || req.headers.get("authorization")?.split(" ")[1];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Signed-in users skip the sign-in page. Done here so /signin can be a
  // static page (it used to read the cookie in its layout). `?session=1` comes
  // from the app layout when a token's account can't be loaded: don't bounce.
  if (pathname === "/signin") {
    if (req.nextUrl.searchParams.has("session")) return NextResponse.next();
    const token = tokenFrom(req);
    if (token && (await verifyToken(token))) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_API.includes(pathname) || isJobRun(pathname)) return NextResponse.next();

  const token = tokenFrom(req);
  if (token && (await verifyToken(token))) return NextResponse.next();

  return NextResponse.json(
    { success: false, error: "Please sign in again." },
    { status: 401 }
  );
}

export const config = {
  matcher: ["/api/((?!embed|recognize).*)", "/signin"],
};
