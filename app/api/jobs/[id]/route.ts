import { NextRequest } from "next/server";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import { readJob } from "@/lib/jobs/engine";

export const GET = async (req: NextRequest, { params }: { params: { id: string } }) => {
  if (!(await getAccount())) return nextError("Please log in", 401);
  try {
    const job = await readJob({ id: params.id }, req.nextUrl.origin);
    return job ? nextSuccess({ job }) : nextError("Job not found", 404);
  } catch (err) {
    return nextError(err);
  }
};
