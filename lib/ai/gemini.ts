// Server-only: calls the Gemini REST API with the key from GEMINI_API_KEY.

const DEFAULT_MODEL = "gemini-3.8-flash";

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GenerateJsonInput = {
  systemInstruction: string;
  parts: GeminiPart[];
  responseSchema: Record<string, unknown>;
  // Gemini 3+ models: "low" | "medium" | "high"
  thinkingLevel?: string;
};

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export const generateJson = async <T>({
  systemInstruction,
  parts,
  responseSchema,
  thinkingLevel,
}: GenerateJsonInput): Promise<T> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY is not set on the server");
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
          ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
        },
      }),
    }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 429) {
      throw new GeminiError("Gemini's rate limit was reached. Try again in a minute.", 429);
    }
    const message = data?.error?.message || `Gemini request failed (${res.status})`;
    throw new GeminiError(message, res.status >= 500 ? 502 : res.status);
  }

  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) throw new GeminiError(`Gemini refused the request (${blockReason})`, 422);

  const candidate = data?.candidates?.[0];
  const text: string = (candidate?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) {
    throw new GeminiError(
      `Gemini returned no content${candidate?.finishReason ? ` (${candidate.finishReason})` : ""}`,
      502
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiError("Gemini's reply was not valid JSON. Try again.", 502);
  }
};
