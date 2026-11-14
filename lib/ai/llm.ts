// Server-only: sends a prompt to whichever provider serves the chosen model.
import { generateClaudeJson } from "./claude";
import { DEFAULT_MODEL } from "./free-models";
import { generateGatewayJson, isGatewayModel } from "./gateway";
import { generateGeminiJson, type GenerateJsonInput } from "./gemini";

export const isClaudeModel = (model?: string) => !!model && model.startsWith("claude-");

export const generateJson = <T>(input: GenerateJsonInput): Promise<T> => {
  const model = input.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const request = { ...input, model };
  if (isGatewayModel(model)) return generateGatewayJson<T>(request);
  if (isClaudeModel(model)) return generateClaudeJson<T>(request);
  return generateGeminiJson<T>(request);
};
