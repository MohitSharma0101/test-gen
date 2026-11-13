// Server-only: calls the Claude API with the key from ANTHROPIC_API_KEY.
// Takes the same input as the Gemini client, so the prompts and schemas in
// generateVariants and recheckQuestion work unchanged.
import Anthropic from "@anthropic-ai/sdk";
import { GeminiError, parseJson, type GenerateJsonInput } from "./gemini";

type Effort = "low" | "medium" | "high";
const EFFORTS: Effort[] = ["low", "medium", "high"];

let client: Anthropic | undefined;
const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new GeminiError("ANTHROPIC_API_KEY is not set on the server");
  }
  client ??= new Anthropic();
  return client;
};

// The prompts describe their output with Gemini's schema dialect ("OBJECT",
// "STRING", propertyOrdering). Claude takes plain JSON Schema, and structured
// outputs need every object closed with additionalProperties: false.
export const toJsonSchema = (schema: unknown): unknown => {
  if (Array.isArray(schema)) return schema.map(toJsonSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key === "propertyOrdering") continue;
    if (key === "type" && typeof value === "string") out.type = value.toLowerCase();
    else if (key === "properties" && value && typeof value === "object") {
      out.properties = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toJsonSchema(v)])
      );
    } else out[key] = toJsonSchema(value);
  }
  if (out.type === "object") out.additionalProperties = false;
  return out;
};

const toContent = (parts: GenerateJsonInput["parts"]): Anthropic.ContentBlockParam[] =>
  parts.map((part) =>
    "inlineData" in part
      ? {
          type: "image",
          source: {
            type: "base64",
            media_type: part.inlineData.mimeType as Anthropic.Base64ImageSource["media_type"],
            data: part.inlineData.data,
          },
        }
      : { type: "text", text: part.text }
  );

export const generateClaudeJson = async <T>(input: GenerateJsonInput): Promise<T> => {
  const model = input.model!;
  const effort = EFFORTS.includes(input.thinkingLevel as Effort)
    ? (input.thinkingLevel as Effort)
    : undefined;

  let message: Anthropic.Message;
  try {
    message = await getClient().messages.create({
      model,
      max_tokens: 16000,
      // The system prompt is the same for every question of a kind, so a
      // teacher working through a paper reads it from the cache
      system: [
        { type: "text", text: input.systemInstruction, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: toContent(input.parts) }],
      output_config: {
        format: {
          type: "json_schema",
          schema: toJsonSchema(input.responseSchema) as Record<string, unknown>,
        },
        // Effort sets how much the model thinks, which is most of the bill
        ...(effort ? { effort } : {}),
      },
    });
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new GeminiError("ANTHROPIC_API_KEY was rejected by the Claude API");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new GeminiError("Claude's rate limit was reached. Try again in a minute.", 429);
    }
    if (err instanceof Anthropic.InternalServerError) {
      throw new GeminiError(
        `${model} is overloaded right now. Try again in a minute or pick another model.`,
        503
      );
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new GeminiError("Could not reach the Claude API. Try again.", 502);
    }
    if (err instanceof Anthropic.APIError) {
      const status = typeof err.status === "number" && err.status < 500 ? err.status : 502;
      throw new GeminiError(err.message || `Claude request failed (${err.status})`, status);
    }
    throw err;
  }

  if (message.stop_reason === "refusal") {
    throw new GeminiError("Claude declined to answer this question.", 422);
  }
  if (message.stop_reason === "max_tokens") {
    throw new GeminiError("Claude's reply was cut off before it finished. Try again.", 502);
  }

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
  if (!text) throw new GeminiError("Claude returned no content", 502);

  return parseJson<T>(text);
};
