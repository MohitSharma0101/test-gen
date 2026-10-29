import { NextRequest, NextResponse } from "next/server";
import { getAccount } from "@/lib/auth";
import { generateVariants } from "@/lib/ai/generateVariants";
import { GeminiError } from "@/lib/ai/gemini";
import { resolveModel } from "@/lib/ai/models";
import {
  DEFAULT_THINKING_MODE,
  THINKING_MODES,
  type TGenerateVariantsRequest,
  type TThinkingMode,
} from "@/lib/ai/types";

// Gemini can take 5-20 s to answer
export const maxDuration = 60;

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BASE64_LENGTH = 4 * 1024 * 1024; // keeps the body under Vercel's 4.5 MB limit
const MAX_TEXT_LENGTH = 20000; // a question and its solution, with room to spare

export const POST = async (request: NextRequest) => {
  const account = await getAccount();
  if (!account) {
    return NextResponse.json({ error: "Please log in to generate variants" }, { status: 401 });
  }

  let body: TGenerateVariantsRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { image, text, answer, questionType, prompt, thinking, model, variantCount } = body ?? {};
  const sourceText = typeof text === "string" ? text.trim() : "";
  // Either a photo to read or the question's text: a question moved into a tab
  // of its own was already transcribed, so no photo comes with it.
  if (!image?.data && !sourceText) {
    return NextResponse.json(
      { error: "Add a PNG, JPEG or WebP image of the question, or its text" },
      { status: 400 }
    );
  }
  if (image?.data && !IMAGE_TYPES.includes(image.mimeType)) {
    return NextResponse.json(
      { error: "Add a PNG, JPEG or WebP image of the question" },
      { status: 400 }
    );
  }
  if (image?.data && image.data.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: "Image is too large" }, { status: 400 });
  }

  try {
    const result = await generateVariants({
      image: image?.data ? image : undefined,
      text: sourceText ? sourceText.slice(0, MAX_TEXT_LENGTH) : undefined,
      answer: typeof answer === "string" ? answer.slice(0, MAX_TEXT_LENGTH) : undefined,
      questionType: questionType === "NUMERICAL" || questionType === "MCQ" ? questionType : undefined,
      prompt: typeof prompt === "string" ? prompt.slice(0, 2000) : undefined,
      thinking: THINKING_MODES.includes(thinking as TThinkingMode)
        ? thinking
        : DEFAULT_THINKING_MODE,
      model: await resolveModel(model),
      variantCount,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    const status = err instanceof GeminiError ? err.status : 500;
    return NextResponse.json(
      { error: err?.message || "Could not generate variants" },
      { status }
    );
  }
};
