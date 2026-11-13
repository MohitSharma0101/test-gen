// Server-only: sends a prompt to whichever provider serves the chosen model.
import { generateClaudeJson } from "./claude";
import { generateGeminiJson, type GenerateJsonInput } from "./gemini";

export const isClaudeModel = (model?: string) => !!model && model.startsWith("claude-");

export const generateJson = <T>(input: GenerateJsonInput): Promise<T> =>
  isClaudeModel(input.model) ? generateClaudeJson<T>(input) : generateGeminiJson<T>(input);
