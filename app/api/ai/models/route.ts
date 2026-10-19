import { NextResponse } from "next/server";
import { getAccount } from "@/lib/auth";
import { GeminiError } from "@/lib/ai/gemini";
import { getDefaultModel, listModels } from "@/lib/ai/models";
import type { TAiModelsResponse } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

export const GET = async () => {
  const account = await getAccount();
  if (!account) {
    return NextResponse.json({ error: "Please log in" }, { status: 401 });
  }
  try {
    const body: TAiModelsResponse = { defaultModel: getDefaultModel(), models: await listModels() };
    return NextResponse.json(body, { status: 200 });
  } catch (err: any) {
    const status = err instanceof GeminiError ? err.status : 500;
    return NextResponse.json({ error: err?.message || "Could not load models" }, { status });
  }
};
