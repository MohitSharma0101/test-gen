// The models the Generate sheet offers, hardcoded so the sheet needs no network
// call to populate its picker. Shared by the browser and the API routes: the
// routes only accept a model id that appears here.
import type { TAiModel } from "./types";

// Through Vercel AI Gateway (AI_GATEWAY_API_KEY), billed to the team's gateway
// credit at the providers' list prices. Every entry reads photos, returns
// structured output, takes a reasoning effort, and is on the gateway's free
// tier as of November 2026 (https://vercel.com/ai-gateway/models), so the
// monthly free credit pays for it. The gateway falls back to another model
// when one is down (see FALLBACKS in gateway.ts).
// Rough cost of 1,000 questions a month at the default settings:
// GPT-5 nano ~$3, Gemini 2.5 Flash-Lite ~$3.50, GPT-5.4 nano ~$10,
// GPT-5 mini ~$16, Gemini 2.5 Flash ~$20.
export const GATEWAY_MODELS: TAiModel[] = [
  { id: "openai/gpt-5-nano", label: "GPT-5 nano", paid: true },
  { id: "openai/gpt-5-mini", label: "GPT-5 mini (stronger, ~5x cost)", paid: true },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (stronger, ~6x cost)", paid: true },
  { id: "openai/gpt-5.4-nano", label: "GPT-5.4 nano", paid: true },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", paid: true },
];

// Free of charge on the Gemini API free tier as of October 2026, with
// GEMINI_API_KEY (https://ai.google.dev/gemini-api/docs/pricing). Free-tier
// capacity is often exhausted at busy times. Deliberately left out:
//   - paid-tier only: gemini-4-argon, gemini-3.1-pro-preview, gemini-omni-*
//   - "-latest" aliases: Google repoints them, so their tier can change silently
//   - undocumented builds the API lists but the docs do not: gemini-3.5-flash,
//     gemini-3.7-flash
//   - gemini-3.5-transcribe: free, but it is a transcription model
//   - all gemini-2.x: 404 "no longer available to new users" on a new key
// Google moves models between tiers, so re-check the pricing page before adding.
export const FREE_MODELS: TAiModel[] = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash (free tier)" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash (free tier)" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (free tier)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite (free tier)" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview (free tier)" },
  { id: "gemma-4-31b-it", label: "Gemma 4 31B (free tier)" },
  { id: "gemma-4-26b-a4b-it", label: "Gemma 4 26B A4B (free tier)" },
];

// Billed per token on the Claude API (ANTHROPIC_API_KEY)
export const PAID_MODELS: TAiModel[] = [
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 (Anthropic)", paid: true },
];

// The single source for "no model chosen": the sheet picks it when nothing is
// remembered on this browser, and generateJson falls back to it when neither a
// request model nor GEMINI_MODEL is set.
export const DEFAULT_MODEL = "openai/gpt-5-nano";

// Everything the picker offers and the API routes accept
export const AI_MODELS: TAiModel[] = [...GATEWAY_MODELS, ...FREE_MODELS, ...PAID_MODELS];

export const isOfferedModel = (id: string) => AI_MODELS.some((m) => m.id === id);
