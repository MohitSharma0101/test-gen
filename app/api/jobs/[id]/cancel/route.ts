import { NextRequest } from "next/server";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import { Role } from "@/data/const";
import { cancelJob } from "@/lib/jobs/engine";

export const POST = async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const account = await getAccount();
  if (!account) return nextError("Please log in", 401);
  if (account.role !== Role.ADMIN) return nextError("Only admins can cancel jobs", 403);
  try {
    const job = await cancelJob(params.id);
    return job ? nextSuccess({ job }) : nextError("The job has already finished", 409);
  } catch (err) {
    return nextError(err);
  }
};
