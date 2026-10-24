// Server-only: calls the Gemini REST API with the key from GEMINI_API_KEY.
import { DEFAULT_FREE_MODEL } from "./free-models";

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GenerateJsonInput = {
  systemInstruction: string;
  parts: GeminiPart[];
  responseSchema: Record<string, unknown>;
  // "low" | "medium" | "high"; mapped to what each model family understands
  thinkingLevel?: string;
  // Overrides GEMINI_MODEL for this call
  model?: string;
};

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

// Gemini 2.x takes a token budget instead of a level
const THINKING_BUDGETS: Record<string, number> = { low: 1024, medium: 8192, high: 24576 };

const thinkingConfigFor = (model: string, thinkingLevel?: string) => {
  if (!thinkingLevel) return undefined;
  const major = Number(model.match(/^gemini-(\d+)/)?.[1]);
  if (!major) return undefined; // Gemma and others: no thinking setting
  if (major >= 3) return { thinkingLevel };
  const budget = THINKING_BUDGETS[thinkingLevel];
  return budget ? { thinkingBudget: budget } : undefined;
};

// Gemma rejects system instructions and JSON mode, so the instructions and the
// schema go into the prompt and the JSON is pulled out of the reply text.
const buildRequest = (model: string, input: GenerateJsonInput) => {
  const thinkingConfig = thinkingConfigFor(model, input.thinkingLevel);
  if (model.startsWith("gemma-")) {
    const instructions = `${input.systemInstruction}\n\nReply with ONE JSON object only, no other text, matching this JSON schema:\n${JSON.stringify(input.responseSchema)}`;
    return {
      contents: [{ role: "user", parts: [{ text: instructions }, ...input.parts] }],
    };
  }
  return {
    systemInstruction: { parts: [{ text: input.systemInstruction }] },
    contents: [{ role: "user", parts: input.parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: input.responseSchema,
      ...(thinkingConfig ? { thinkingConfig } : {}),
    },
  };
};

// LaTeX in a JSON string has to arrive as "\\frac", and the model regularly
// sends "\frac". That is still valid JSON - \f is the formfeed escape - so it
// parses without complaint and the text silently loses the command: \frac
// becomes "rac", \textbf becomes a tab plus "extbf", and the tab then makes
// markdown render the line as a code block. \u is worse: "\upsilon" is not a
// valid escape at all, so the whole reply fails to parse.
//
// So a backslash that starts one of those escapes is doubled before parsing,
// unless it is already escaped. \n is deliberately left alone: these fields use
// real newlines between options and in solutions.
//
// Scanned rather than matched with a regex: a pattern has to look behind itself
// to tell a lone backslash from the second half of a pair, and it then misses
// two lone escapes that sit next to each other - which "\,\text{V}" is.
//
// Backslashes only ever appear inside strings in JSON, so walking the whole
// reply is safe.
export const repairJsonEscapes = (text: string) => {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }

    const next = text[i + 1];
    // A trailing backslash cannot be an escape at all
    if (next === undefined) {
      out += "\\\\";
      break;
    }
    // An escaped backslash is already correct; step over both
    if (next === "\\") {
      out += "\\\\";
      i++;
      continue;
    }
    // Escapes this app actually means: quotes, solidus, and the newlines that
    // separate options and solution steps
    if (next === '"' || next === "/" || next === "n") {
      out += ch + next;
      i++;
      continue;
    }
    // A real unicode escape needs its four hex digits
    if (next === "u" && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
      out += ch + next;
      i++;
      continue;
    }
    // Everything else is a LaTeX command the model forgot to escape: \frac,
    // \textbf, \alpha. Some are valid JSON escapes and corrupt the text
    // silently, the rest make the whole reply fail to parse.
    out += "\\\\" + next;
    i++;
  }
  return out;
};

const parseJson = <T>(text: string): T => {
  try {
    return JSON.parse(repairJsonEscapes(text)) as T;
  } catch {}
  try {
    return JSON.parse(text) as T;
  } catch {}
  // Replies without JSON mode may wrap the object in ``` fences or add text around it
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const object = text.slice(start, end + 1);
    try {
      return JSON.parse(repairJsonEscapes(object)) as T;
    } catch {}
    try {
      return JSON.parse(object) as T;
    } catch {}
  }
  throw new GeminiError("Gemini's reply was not valid JSON. Try again.", 502);
};

export const generateJson = async <T>(input: GenerateJsonInput): Promise<T> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY is not set on the server");
  const model = input.model || process.env.GEMINI_MODEL || DEFAULT_FREE_MODEL;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(buildRequest(model, input)),
    }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 429) {
      // A free-plan quota of 0 means the model is paid-only for this key
      if (/limit:\s*0\b/.test(data?.error?.message || "")) {
        throw new GeminiError(`${model} is not on Gemini's free plan. Pick another model.`, 429);
      }
      throw new GeminiError("Gemini's rate limit was reached. Try again in a minute.", 429);
    }
    if (res.status === 503) {
      throw new GeminiError(
        `${model} is overloaded right now (high demand). Try again in a minute or pick another model.`,
        503
      );
    }
    const message = data?.error?.message || `Gemini request failed (${res.status})`;
    throw new GeminiError(message, res.status >= 500 ? 502 : res.status);
  }

  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) throw new GeminiError(`Gemini refused the request (${blockReason})`, 422);

  const candidate = data?.candidates?.[0];
  const text: string = (candidate?.content?.parts ?? [])
    .filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) {
    throw new GeminiError(
      `Gemini returned no content${candidate?.finishReason ? ` (${candidate.finishReason})` : ""}`,
      502
    );
  }

  return parseJson<T>(text);
};
