import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import { getAccount } from "@/lib/auth";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { embedFaces, FACE_SERVICE_CONFIGURED } from "@/lib/faceService";
import FaceSignature from "@/models/FaceSignature";
import User from "@/models/User";

// Enough shots to cover a few angles without making the desk session tedious.
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Below this the matcher has too little to go on and accuracy drops sharply,
// so we tell the admin rather than quietly accepting a weak enrollment.
const RECOMMENDED_SIGNATURES = 5;

export const POST = async (request: NextRequest) => {
  const account = await getAccount();
  if (!account) return nextError("Please log in to enroll a face", 401);

  if (!FACE_SERVICE_CONFIGURED) {
    return nextError("Face service is not configured. Set FACE_SERVICE_URL.", 503);
  }

  try {
    const form = await request.formData();
    const userId = form.get("userId");
    const mode = form.get("mode") === "append" ? "append" : "replace";
    const images = form.getAll("images").filter((item): item is File => item instanceof File);

    if (typeof userId !== "string" || !userId) {
      return nextError("User id is required", 400);
    }
    if (!images.length) {
      return nextError("At least one photo is required", 400);
    }
    if (images.length > MAX_IMAGES) {
      return nextError(`Please send at most ${MAX_IMAGES} photos at a time`, 400);
    }
    const tooLarge = images.find((image) => image.size > MAX_IMAGE_BYTES);
    if (tooLarge) {
      return nextError(`${tooLarge.name || "A photo"} is larger than 5 MB`, 400);
    }

    await dbConnect();

    const user = await User.findById(userId).select("name");
    if (!user) return nextError("Student not found", 404);

    const { results } = await embedFaces(images);

    const accepted = results.filter((result) => result.ok && result.vector?.length);
    const rejected = results
      .filter((result) => !result.ok || !result.vector?.length)
      .map((result) => ({ index: result.index, reason: result.reason ?? "no signature" }));

    if (!accepted.length) {
      return nextError(
        "No usable face found in any photo. Move closer, face the camera, and keep only the student in frame.",
        422
      );
    }

    // Replace is the normal path: a re-enrollment should supersede the old
    // set rather than mix two lighting conditions together. Corrections are
    // kept either way, since those came from real classroom photos.
    if (mode === "replace") {
      await FaceSignature.deleteMany({ user: userId, source: "enrollment" });
    }

    await FaceSignature.insertMany(
      accepted.map((result) => ({
        user: userId,
        vector: result.vector,
        faceWidth: result.faceWidth,
        source: "enrollment",
      }))
    );

    const signatureCount = await FaceSignature.countDocuments({ user: userId });
    await User.findByIdAndUpdate(userId, {
      faceSignatureCount: signatureCount,
      faceEnrolledAt: new Date(),
    });

    return nextSuccess({
      accepted: accepted.length,
      rejected,
      signatureCount,
      // The admin can still save a thin enrollment, but should know it is thin.
      weak: signatureCount < RECOMMENDED_SIGNATURES,
      recommended: RECOMMENDED_SIGNATURES,
    });
  } catch (err: any) {
    return nextError(err?.message || "Could not enroll this face");
  }
};

export const GET = async (request: NextRequest) => {
  const account = await getAccount();
  if (!account) return nextError("Please log in", 401);

  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) return nextError("User id is required", 400);

    await dbConnect();

    // Signature vectors are large and the caller only needs the tally, so
    // this deliberately does not fetch them.
    const [enrollment, correction] = await Promise.all([
      FaceSignature.countDocuments({ user: userId, source: "enrollment" }),
      FaceSignature.countDocuments({ user: userId, source: "correction" }),
    ]);
    const user = await User.findById(userId).select("faceEnrolledAt");

    return nextSuccess({
      signatureCount: enrollment + correction,
      enrollmentCount: enrollment,
      correctionCount: correction,
      faceEnrolledAt: user?.faceEnrolledAt ?? null,
      recommended: RECOMMENDED_SIGNATURES,
    });
  } catch (err: any) {
    return nextError(err?.message);
  }
};

export const DELETE = async (request: NextRequest) => {
  const account = await getAccount();
  if (!account) return nextError("Please log in", 401);

  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) return nextError("User id is required", 400);

    await dbConnect();

    await FaceSignature.deleteMany({ user: userId });
    await User.findByIdAndUpdate(userId, {
      faceSignatureCount: 0,
      faceEnrolledAt: null,
    });

    return nextSuccess({ signatureCount: 0 });
  } catch (err: any) {
    return nextError(err?.message);
  }
};
