import { NextRequest } from "next/server";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import { Role } from "@/data/const";
import { readJob, startJob } from "@/lib/jobs/engine";
import { getJobHandler } from "@/lib/jobs/registry";

// GET ?type=remark-all -> the latest job of that type (null if none).
export const GET = async (req: NextRequest) => {
  const account = await getAccount();
  if (!account) return nextError("Please log in", 401);
  const type = req.nextUrl.searchParams.get("type");
  if (!type) return nextError("type is required", 400);
  try {
    return nextSuccess({ job: await readJob({ type }, req.nextUrl.origin) });
  } catch (err) {
    return nextError(err);
  }
};

// POST { type, options } -> starts a job, or returns the one already running.
export const POST = async (req: NextRequest) => {
  const account = await getAccount();
  if (!account) return nextError("Please log in", 401);
  try {
    const { type, options } = (await req.json()) as { type?: string; options?: Record<string, unknown> };
    const handler = type ? getJobHandler(type) : undefined;
    if (!type || !handler) return nextError("Unknown job type", 400);
    if (handler.adminOnly && account.role !== Role.ADMIN) return nextError("Only admins can run this", 403);
    const res = await startJob(type, options ?? {}, account.name || account.username || "", req.nextUrl.origin);
    return nextSuccess(res, res.alreadyRunning ? 200 : 201);
  } catch (err) {
    return nextError(err);
  }
};
