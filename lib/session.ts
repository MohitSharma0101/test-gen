import type { NextResponse } from "next/server";
import { AUTH_TOKEN_KEY } from "@/lib/api";

// How long a staff sign-in lasts. The cookie and the token expire together;
// before, the browser cookie lived 1 hour but the token itself was valid for
// 7 days, so a copied token outlived the session by a week.
export const SESSION_SECONDS = 60 * 60 * 12;

/**
 * The session cookie is set by the server, httpOnly: page scripts (and so any
 * injected script) can't read it. Before, the browser set it from JavaScript.
 */
export const setSessionCookie = (res: NextResponse, token: string) => {
  res.cookies.set(AUTH_TOKEN_KEY, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return res;
};

export const clearSessionCookie = (res: NextResponse) => {
  res.cookies.set(AUTH_TOKEN_KEY, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
};

/** Shared rule for new passwords (register, reset). */
export const MIN_PASSWORD_LENGTH = 8;
