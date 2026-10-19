// Server-only: the Gemini and Gemma models this API key can use, read live
// from Google so new models show up in the Generate sheet without a code change.
// Listing models is free: it does not count against the generation quota.
import { DEFAULT_MODEL, GeminiError } from "./gemini";
import type { TAiModel } from "./types";

const CACHE_MS = 60 * 60 * 1000; // one hour

// Models that can't answer a text + image prompt with JSON
const EXCLUDED = /embedding|aqa|tts|audio|live|image|imagen|veo|lyria|robotics|computer-use|nano-banana|learnlm/i;

let cache: { at: number; models: TAiModel[] } | null = null;

type RawModel = {
  name?: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
};

export const getDefaultModel = () => process.env.GEMINI_MODEL || DEFAULT_MODEL;

export const listModels = async (): Promise<TAiModel[]> => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.models;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY is not set on the server");

  const raw: RawModel[] = [];
  let pageToken = "";
  do {
    const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { "x-goog-api-key": apiKey }, cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new GeminiError(data?.error?.message || `Could not load Gemini models (${res.status})`, 502);
    }
    raw.push(...(data?.models ?? []));
    pageToken = data?.nextPageToken || "";
  } while (pageToken);

  const models = raw
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => ({
      id: (m.name || "").replace(/^models\//, ""),
      label: m.displayName || (m.name || "").replace(/^models\//, ""),
    }))
    .filter((m) => /^(gemini|gemma)-/.test(m.id) && !EXCLUDED.test(m.id))
    // Gemini before Gemma, newest version first
    .sort((a, b) => {
      const family = (id: string) => (id.startsWith("gemini") ? 0 : 1);
      if (family(a.id) !== family(b.id)) return family(a.id) - family(b.id);
      return b.id.localeCompare(a.id, undefined, { numeric: true });
    });

  cache = { at: Date.now(), models };
  return models;
};

// A model id from the browser is only used if Google lists it for this key.
// Returns undefined for "use the default".
export const resolveModel = async (requested: unknown): Promise<string | undefined> => {
  if (typeof requested !== "string" || !requested.trim()) return undefined;
  const id = requested.trim();
  const models = await listModels();
  if (!models.some((m) => m.id === id)) {
    throw new GeminiError(`The model "${id.slice(0, 80)}" is not available. Pick another one.`, 400);
  }
  return id;
};
