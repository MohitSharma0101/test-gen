// The models the Generate sheet offers, hardcoded so the sheet needs no network
// call to populate its picker. Shared by the browser and the API routes: the
// routes only accept a model id that appears here.
//
// Every entry is free of charge on the Gemini API free tier as of October 2026
// (https://ai.google.dev/gemini-api/docs/pricing). Deliberately left out:
//   - paid-tier only: gemini-4-argon, gemini-3.1-pro-preview, gemini-omni-*
//   - "-latest" aliases: Google repoints them, so their tier can change silently
//   - undocumented builds the API lists but the docs do not: gemini-3.5-flash,
//     gemini-3.7-flash
//   - gemini-3.5-transcribe: free, but it is a transcription model
//   - all gemini-2.x: 404 "no longer available to new users" on a new key
// Google moves models between tiers, so re-check the pricing page before adding.
import type { TAiModel } from "./types";

export const FREE_MODELS: TAiModel[] = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
  { id: "gemma-4-31b-it", label: "Gemma 4 31B" },
  { id: "gemma-4-26b-a4b-it", label: "Gemma 4 26B A4B" },
];

// Picked in the sheet when nothing is remembered on this browser.
export const DEFAULT_FREE_MODEL = "gemini-3.1-flash-lite";

export const isFreeModel = (id: string) => FREE_MODELS.some((m) => m.id === id);
