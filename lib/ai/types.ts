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
  model?: string; // a Gemini/Gemma model id; empty means the server default
};

// The model picker in the Generate sheet
export type TAiModel = { id: string; label: string };
export type TAiModelsResponse = { defaultModel: string; models: TAiModel[] };

export type TGenerateVariantsResponse = {
  questionType: TQuestionType;
  questions: TGeneratedQuestion[];
};

// Recheck: one Gemini call that solves the question without seeing our answer,
// checks its quality and returns a fresh question, answer and solution.
export type TRecheckRequest = {
  text: string;
  answerKey: string; // line 1 of `ans`; compared on the server, never shown to Gemini
  questionType: TQuestionType;
  kind: TGeneratedQuestion["kind"];
  originalText?: string; // for a variant: the question it was made from
  image?: { mimeType: string; data: string }; // for the original: the photo it was transcribed from
  model?: string; // same model picked for generation; empty means GEMINI_RECHECK_MODEL or the default
};

// checked: same answer, solution refreshed
// answer-changed: question was fine but our answer key was wrong
// question-fixed: the question itself was broken and has been rewritten
// manual: Gemini could not verify it (e.g. needs a figure, more than one correct option)
export type TRecheckStatus = "checked" | "answer-changed" | "question-fixed" | "manual";

export type TRecheckResponse = {
  status: TRecheckStatus;
  summary: string;
  issues: string[];
  previousAnswer?: string;
  newAnswer?: string;
  // Missing when status is "manual"
  question?: Pick<TGeneratedQuestion, "text" | "ans" | "needsDiagram">;
};
