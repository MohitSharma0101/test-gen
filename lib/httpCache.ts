import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

// Conditional responses for read endpoints.
//
// The app needs fresh data, so nothing is served from a cache without asking
// the server first. What this avoids is re-sending a body that has not changed:
// the browser keeps the response, sends its ETag back as If-None-Match, and an
// unchanged list answers with a 304 of a couple of hundred bytes instead of
// tens of kilobytes.
//
// "no-cache" is the header that asks for exactly that - store it, but always
// revalidate before using it. It is not "no-store".
const CACHE_CONTROL = "private, no-cache, must-revalidate";

const etagFor = (body: string) =>
  `W/"${crypto.createHash("sha1").update(body).digest("base64url")}"`;

// Returns the body with an ETag, or 304 when the client already has this exact
// response. Same shape as NextResponse.json for the caller.
export const jsonRevalidated = (
  request: NextRequest,
  data: unknown,
  init?: { status?: number }
) => {
  const body = JSON.stringify(data);
  const etag = etagFor(body);

  // A list of ETags is allowed here, and "*" matches anything the client holds
  const ifNoneMatch = request.headers.get("if-none-match");
  const matches =
    ifNoneMatch === "*" ||
    ifNoneMatch
      ?.split(",")
      .map((tag) => tag.trim())
      .includes(etag);

  if (matches) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": CACHE_CONTROL },
    });
  }

  return new NextResponse(body, {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ETag: etag,
      "Cache-Control": CACHE_CONTROL,
    },
  });
};
