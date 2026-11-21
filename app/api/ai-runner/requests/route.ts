import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { isRunner } from "@/lib/aiRequests";
import AiRequest from "@/models/AiRequest";

/** Runner: requests waiting for review (id, type, title, result), e.g. to rewrite a paper's note. ?type=paper */
export const GET = async (req: NextRequest) => {
  if (!isRunner(req)) return nextError("Not allowed", 403);
  try {
    const type = req.nextUrl.searchParams.get("type");
    await dbConnect();
    const rows = await AiRequest.find({ status: "review", ...(type ? { type } : {}) })
      .select("type title result createdAt")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return nextSuccess({ requests: rows });
  } catch (err) {
    return nextError(err);
  }
};
