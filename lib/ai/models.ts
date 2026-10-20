// Server-only: validates the model id the browser picked.
import { GeminiError } from "./gemini";
import { FREE_MODELS, isFreeModel } from "./free-models";

// A model id from the browser is only used if it is one we offer.
// Returns undefined for "use the default".
export const resolveModel = async (requested: unknown): Promise<string | undefined> => {
  if (typeof requested !== "string" || !requested.trim()) return undefined;
  const id = requested.trim();
  if (!isFreeModel(id)) {
    throw new GeminiError(`The model "${id.slice(0, 80)}" is not available. Pick another one.`, 400);
  }
  return id;
};

export { FREE_MODELS };
