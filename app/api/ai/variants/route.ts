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

  const { image, prompt, thinking, model } = body ?? {};
  if (!image?.data || !IMAGE_TYPES.includes(image.mimeType)) {
    return NextResponse.json(
      { error: "Add a PNG, JPEG or WebP image of the question" },
      { status: 400 }
    );
  }
  if (image.data.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: "Image is too large" }, { status: 400 });
  }

  try {
    const result = await generateVariants({
      image,
      prompt: typeof prompt === "string" ? prompt.slice(0, 2000) : undefined,
      thinking: THINKING_MODES.includes(thinking as TThinkingMode)
        ? thinking
        : DEFAULT_THINKING_MODE,
      model: await resolveModel(model),
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
