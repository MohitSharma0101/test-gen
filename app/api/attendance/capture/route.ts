import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import { getAccount } from "@/lib/auth";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import {
  FACE_SERVICE_CONFIGURED,
  recognizeFaces,
  RosterEntry,
} from "@/lib/faceService";
import FaceSignature from "@/models/FaceSignature";
import User from "@/models/User";

// Teachers take a few shots covering sections of the room rather than one wide
// frame, because a face needs enough pixels to be identifiable at all.
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type Named = { userId: string; name: string };

export const POST = async (request: NextRequest) => {
  const account = await getAccount();
  if (!account) return nextError("Please log in", 401);

  if (!FACE_SERVICE_CONFIGURED) {
    return nextError("Face service is not configured. Set FACE_SERVICE_URL.", 503);
  }

  try {
    const form = await request.formData();
    const batchId = form.get("batchId");
    const date = form.get("date");
    const images = form.getAll("images").filter((item): item is File => item instanceof File);

    if (typeof batchId !== "string" || !batchId) return nextError("Batch is required", 400);
    if (typeof date !== "string" || !date) return nextError("Date is required", 400);
    if (!images.length) return nextError("At least one photo is required", 400);
    if (images.length > MAX_IMAGES) {
      return nextError(`Please send at most ${MAX_IMAGES} photos`, 400);
    }
    const tooLarge = images.find((image) => image.size > MAX_IMAGE_BYTES);
    if (tooLarge) return nextError(`${tooLarge.name || "A photo"} is larger than 5 MB`, 400);

    await dbConnect();

    const students = await User.find({ batchIds: batchId }).sort({ name: 1 }).select("name");
    if (!students.length) return nextError("This batch has no students", 404);

    const nameById = new Map<string, string>(
      students.map((student) => [String(student._id), student.name as string])
    );

    const signatures = await FaceSignature.find({
      user: { $in: students.map((student) => student._id) },
    }).select("user vector");

    const vectorsByUser = new Map<string, number[][]>();
    for (const signature of signatures) {
      const key = String(signature.user);
      const list = vectorsByUser.get(key) ?? [];
      list.push(signature.vector as number[]);
      vectorsByUser.set(key, list);
    }

    // Only that batch's signatures go to the service: a gallery of ~40 is both
    // faster and markedly more accurate than the whole school, since there are
    // far fewer people to confuse someone with.
    const roster: RosterEntry[] = [];
    const notEnrolled: Named[] = [];
    for (const student of students) {
      const userId = String(student._id);
      const vectors = vectorsByUser.get(userId);
      if (vectors?.length) {
        roster.push({ userId, vectors });
      } else {
        // Nothing to match against. Called out explicitly so the teacher knows
        // this student was never a candidate, rather than appearing absent.
        notEnrolled.push({ userId, name: nameById.get(userId) ?? "" });
      }
    }

    if (!roster.length) {
      return nextError("No student in this batch has an enrolled face yet", 422);
    }

    const result = await recognizeFaces(images, roster);

    const withName = (userId: string) => ({
      userId,
      name: nameById.get(userId) ?? "",
    });

    const recognised = result.recognised.map((match) => ({
      ...withName(match.userId),
      confidence: match.confidence,
    }));

    const uncertain = result.uncertain.map((face) => ({
      crop: face.crop,
      vector: face.vector,
      candidates: face.candidates.map((candidate) => ({
        ...withName(candidate.userId),
        confidence: candidate.confidence,
      })),
    }));

    // Everyone not confidently recognised starts out absent, including the
    // uncertain ones. A wrong name marked present is silent, whereas an absent
    // mark surfaces for the teacher to correct, so default to the visible error.
    const recognisedIds = new Set(recognised.map((match) => match.userId));
    const suggestedAbsent = students
      .map((student) => String(student._id))
      .filter((userId) => !recognisedIds.has(userId));

    return nextSuccess({
      batchId,
      date,
      recognised,
      uncertain,
      notDetected: result.notDetected.map(withName),
      notEnrolled,
      suggestedAbsent,
      stats: {
        ...result.stats,
        rosterSize: students.length,
        enrolledCount: roster.length,
      },
    });
  } catch (err: any) {
    return nextError(err?.message || "Could not read the attendance photos");
  }
};
