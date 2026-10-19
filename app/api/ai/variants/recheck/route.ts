import { NextRequest, NextResponse } from "next/server";
import { getAccount } from "@/lib/auth";
import { recheckQuestion } from "@/lib/ai/recheckQuestion";
import { GeminiError } from "@/lib/ai/gemini";
import { resolveModel } from "@/lib/ai/models";
import type { TRecheckRequest } from "@/lib/ai/types";

// One Gemini call with high thinking: usually 15-40 s
export const maxDuration = 60;

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BASE64_LENGTH = 4 * 1024 * 1024; // keeps the body under Vercel's 4.5 MB limit
const MAX_TEXT_LENGTH = 20000;

export const POST = async (request: NextRequest) => {
  const account = await getAccount();
  if (!account) {
    return NextResponse.json({ error: "Please log in to recheck questions" }, { status: 401 });
  }

  let body: TRecheckRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { text, answerKey, questionType, kind, originalText, image, model } = body ?? {};
  if (typeof text !== "string" || !text.trim() || text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "The question text is missing or too long" }, { status: 400 });
  }
  if (image && (!image.data || !IMAGE_TYPES.includes(image.mimeType) || image.data.length > MAX_BASE64_LENGTH)) {
    return NextResponse.json({ error: "Invalid question image" }, { status: 400 });
  }

  try {
    const result = await recheckQuestion({
      text,
      answerKey: typeof answerKey === "string" ? answerKey : "",
      questionType: questionType === "NUMERICAL" ? "NUMERICAL" : "MCQ",
      kind: kind === "original" ? "original" : "variant",
      originalText:
        typeof originalText === "string" ? originalText.slice(0, MAX_TEXT_LENGTH) : undefined,
      image: kind === "original" ? image : undefined,
      model: await resolveModel(model),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    const status = err instanceof GeminiError ? err.status : 500;
    return NextResponse.json({ error: err?.message || "Could not recheck the question" }, { status });
  }
};
