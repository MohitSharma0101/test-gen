// The prompts describe their output with Gemini's schema dialect ("OBJECT",
// "STRING", propertyOrdering). Claude and the OpenAI-style APIs take plain JSON
// Schema, and strict structured outputs need every object closed with
// additionalProperties: false.
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
