// Server-only: calls models through Vercel AI Gateway's OpenAI-compatible
// Chat Completions API, with the key from AI_GATEWAY_API_KEY. Model ids are
// "provider/model", e.g. "openai/gpt-5-nano". Takes the same input as the Gemini
// client, so the prompts and schemas work unchanged.
import { GeminiError, MAX_OUTPUT_TOKENS, parseJson, type GenerateJsonInput } from "./gemini";
import { toJsonSchema } from "./schema";

const ENDPOINT = "https://ai-gateway.vercel.sh/v1/chat/completions";

export const isGatewayModel = (model?: string) => !!model && model.includes("/");

// When the chosen model is down or overloaded, the gateway tries these in
// order. Each list mixes providers, so one provider's outage does not take
// the sheet down, and every model in it reads photos and returns structured
// output.
const FALLBACKS: Record<string, string[]> = {
  "openai/gpt-5-nano": ["google/gemini-2.5-flash-lite", "openai/gpt-5.4-nano"],
  "openai/gpt-5.4-nano": ["openai/gpt-5-nano", "google/gemini-2.5-flash-lite"],
  "openai/gpt-5-mini": ["google/gemini-2.5-flash", "openai/gpt-5-nano"],
  "google/gemini-2.5-flash": ["openai/gpt-5-mini", "openai/gpt-5-nano"],
  "google/gemini-2.5-flash-lite": ["openai/gpt-5-nano", "openai/gpt-5.4-nano"],
  "stepfun/step-3.7-flash": ["openai/gpt-5-mini", "google/gemini-2.5-flash"],
  "thinkingmachines/inkling-2-small": ["openai/gpt-5-mini", "google/gemini-2.5-flash"],
  "openai/o4-mini": ["openai/gpt-5-mini", "google/gemini-2.5-flash"],
};

type ChatContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

const toContent = (parts: GenerateJsonInput["parts"]): ChatContent[] =>
  parts.map((part) =>
    "inlineData" in part
      ? {
          type: "image_url",
          image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` },
        }
      : { type: "text", text: part.text }
  );

const errorFor = (status: number, model: string, detail?: string) => {
  if (status === 401 || status === 403) {
    return new GeminiError("AI_GATEWAY_API_KEY was rejected by Vercel AI Gateway");
  }
  if (status === 402) {
    return new GeminiError(
      "The Vercel AI Gateway credit has run out. Add credit or pick another model.",
      402
    );
  }
  if (status === 429) {
    return new GeminiError("The AI Gateway rate limit was reached. Try again in a minute.", 429);
  }
  if (status >= 500) {
    return new GeminiError(
      `${model} and its backups are unavailable right now. Try again in a minute or pick another model.`,
      503
    );
  }
  return new GeminiError(detail || `AI Gateway request failed (${status})`, status);
};

export const generateGatewayJson = async <T>(input: GenerateJsonInput): Promise<T> => {
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!apiKey) throw new GeminiError("AI_GATEWAY_API_KEY is not set on the server");
  const model = input.model!;
  const fallbacks = FALLBACKS[model];

  const body = {
    model,
    messages: [
      { role: "system", content: input.systemInstruction },
      { role: "user", content: toContent(input.parts) },
    ],
    stream: false,
    // Thinking counts toward this, so a runaway reply stops here
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "result",
        strict: true,
        schema: toJsonSchema(input.responseSchema),
      },
    },
    // The gateway maps this to each provider's own thinking setting. Thinking
    // is most of the bill, so each route asks for only what it needs.
    ...(input.thinkingLevel ? { reasoning: { effort: input.thinkingLevel } } : {}),
    ...(fallbacks ? { providerOptions: { gateway: { models: fallbacks } } } : {}),
  };

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      // Give up just before the route's 60 s limit, so the teacher gets a
      // clear message instead of a dropped connection
      signal: AbortSignal.timeout(55_000),
    });
  } catch (err) {
    if ((err as Error)?.name === "TimeoutError") {
      throw new GeminiError(`${model} took too long to answer. Try again or pick another model.`, 504);
    }
    throw new GeminiError("Could not reach Vercel AI Gateway. Try again.", 502);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.error?.message;
    throw errorFor(res.status, model, typeof detail === "string" ? detail : undefined);
  }

  const choice = data?.choices?.[0];
  if (choice?.finish_reason === "content_filter" || choice?.message?.refusal) {
    throw new GeminiError("The model declined to answer this question.", 422);
  }
  if (choice?.finish_reason === "length") {
    throw new GeminiError("The model's reply was cut off before it finished. Try again.", 502);
  }
  const text: unknown = choice?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new GeminiError("The model returned no content", 502);
  }

  return parseJson<T>(text);
};
