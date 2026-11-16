import { NextRequest } from "next/server";
import { waitUntil } from "@vercel/functions";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { isJobSecret, runJobSlice } from "@/lib/jobs/engine";

// One slice of a background job. Server-to-server only (lib/jobs/engine.ts).
// Replies at once and works in the background, so the slice that kicked this
// one isn't kept alive (and billed) while it waits.
export const maxDuration = 300;

export const POST = async (req: NextRequest, { params }: { params: { id: string } }) => {
  if (!isJobSecret(req.headers.get("x-job-secret"))) return nextError("Not allowed", 403);
  waitUntil(runJobSlice(params.id, req.nextUrl.origin).catch((err) => console.error("job slice failed", params.id, err)));
  return nextSuccess({ accepted: true }, 202);
};
