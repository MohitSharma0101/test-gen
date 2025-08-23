// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_TOKEN_KEY } from "./lib/api";
import { cookies, headers } from "next/headers";
import { verifyToken } from "./lib/tokenUtils";

const EXCLUDED_PATHS = ["/api/auth/"]; // protect all API routes

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // check if request is for protected route
  if (!EXCLUDED_PATHS.some((path) => pathname.startsWith(path))) {
    try {
      const cookieStore = cookies();
      const authorization = headers().get("authorization");

      const token =
        cookieStore.get(AUTH_TOKEN_KEY)?.value || authorization?.split(" ")[1];
      if (!token) {
        return null;
      }

      const accountFromToken = await verifyToken(token);


      if (accountFromToken) {
        return NextResponse.next(); // allow access
      } else throw new Error("Unauthorized");
    } catch (err) {
      console.log("err", err);
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid or expired token" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

// apply middleware only to API routes
export const config = {
  matcher: ["/api/:path*"],
};
