// Shared between the variants API and the Generate sheet.

export type TQuestionType = "MCQ" | "NUMERICAL";

// Gemini's thinking level: more thinking is slower but usually more accurate.
export const THINKING_MODES = ["low", "medium", "high"] as const;
export type TThinkingMode = (typeof THINKING_MODES)[number];
export const DEFAULT_THINKING_MODE: TThinkingMode = "medium";

// Phase 2 will fill this with a generated or cropped diagram.
export type TGeneratedDiagram = {
  url?: string; // set once uploaded
  dataUrl?: string; // local preview before upload
};

export type TGeneratedQuestion = {
  id: string;
  kind: "original" | "variant";
  // Same fields as TQuestion, so they can be uploaded as-is
  text: string;
  ans: string; // line 1: "(b\)" (escaped so "(c)" is not shown as ©) or the numeric value; then the detailed solution
  needsDiagram: boolean;
  diagram: TGeneratedDiagram | null;
};

export type TGenerateVariantsRequest = {
  image: { mimeType: string; data: string }; // base64, no data: prefix
  prompt?: string;
  thinking?: TThinkingMode;
};

export type TGenerateVariantsResponse = {
  questionType: TQuestionType;
  questions: TGeneratedQuestion[];
};
