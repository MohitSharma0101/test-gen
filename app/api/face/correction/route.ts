import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import { getAccount } from "@/lib/auth";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import FaceSignature from "@/models/FaceSignature";
import User from "@/models/User";

// A teacher resolving the review queue is the best training data available:
// the face came from a real class photo, in real lighting, at real distance.
// Storing it lifts accuracy over the first few weeks with no re-enrollment.
export const POST = async (request: NextRequest) => {
  const account = await getAccount();
  if (!account) return nextError("Please log in", 401);

  try {
    const { userId, vector } = (await request.json()) as {
      userId?: string;
      vector?: number[];
    };

    if (!userId) return nextError("User id is required", 400);
    if (!Array.isArray(vector) || !vector.length) {
      return nextError("A face vector is required", 400);
    }
    if (vector.some((value) => typeof value !== "number" || !isFinite(value))) {
      return nextError("Face vector must be finite numbers", 400);
    }

    await dbConnect();

    await FaceSignature.create({ user: userId, vector, source: "correction" });

    const signatureCount = await FaceSignature.countDocuments({ user: userId });
    await User.findByIdAndUpdate(userId, { faceSignatureCount: signatureCount });

    return nextSuccess({ signatureCount });
  } catch (err: any) {
    return nextError(err?.message || "Could not save the correction");
  }
};
