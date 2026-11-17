import { NextRequest } from "next/server";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import { clearJob, readJob } from "@/lib/jobs/engine";
import { Role } from "@/data/const";

export const GET = async (req: NextRequest, { params }: { params: { id: string } }) => {
  if (!(await getAccount())) return nextError("Please log in", 401);
  try {
    const job = await readJob({ id: params.id }, req.nextUrl.origin);
    return job ? nextSuccess({ job }) : nextError("Job not found", 404);
  } catch (err) {
    return nextError(err);
  }
};

// "Done" on a finished job's card: removes the job and its result for every
// admin and device. Already gone counts as done.
export const DELETE = async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const account = await getAccount();
  if (!account) return nextError("Please log in", 401);
  if (account.role !== Role.ADMIN) return nextError("Only admins can clear jobs", 403);
  try {
    await clearJob(params.id);
    return nextSuccess(null);
  } catch (err) {
    return nextError(err, 409);
  }
};
