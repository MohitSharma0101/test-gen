import { NextRequest } from "next/server";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { isRunner } from "@/lib/aiRequests";
import { uploadFromServer } from "@/lib/storage";

/**
 * Nightly runner: upload one diagram (SVG it drew, or a PNG from Workers AI)
 * and get its public URL to put in the question as ![](url). The runner never
 * holds storage keys. Body: the raw file, Content-Type image/svg+xml or image/png.
 */
export const POST = async (req: NextRequest) => {
  if (!isRunner(req)) return nextError("Not allowed", 403);
  try {
    const type = (req.headers.get("content-type") || "").split(";")[0].trim();
    const data = Buffer.from(await req.arrayBuffer());
    if (!data.length) return nextError("Empty file", 400);
    const url = await uploadFromServer(data, type);
    return nextSuccess({ url });
  } catch (err) {
    return nextError(err);
  }
};
