// Shared between the variants API and the Generate sheet.

export type TQuestionType = "MCQ" | "NUMERICAL";

// Gemini's thinking level: more thinking is slower but usually more accurate.
export const THINKING_MODES = ["low", "medium", "high"] as const;
export type TThinkingMode = (typeof THINKING_MODES)[number];
export const DEFAULT_THINKING_MODE: TThinkingMode = "medium";

export type TGeneratedQuestion = {
  id: string;
  kind: "original" | "variant";
  // Same fields as TQuestion, so they can be uploaded as-is
  text: string;
  ans: string; // line 1: "(b\)" (escaped so "(c)" is not shown as ©) or the numeric value; then the detailed solution
  // Diagrams are drawn outside the app: the sheet hands over a prompt to paste
  // into an image model, and the picture comes back through the editor.
  needsDiagram: boolean;
  needsSolutionDiagram: boolean;
  // What to draw, in words, written during generation and saved here so the
  // Copy prompt button needs no call of its own. Empty means the prompt falls
  // back to its generic wording.
  diagramBrief: string;
  solutionDiagramBrief: string;
};

export type TGenerateVariantsRequest = {
  // A question comes in either as a photo or as Mathpix Markdown text - a
  // question moved into its own tab has already been transcribed, so there is
  // no photo left to send.
  image?: { mimeType: string; data: string }; // base64, no data: prefix
  text?: string; // Mathpix Markdown of the question, used when there is no photo
  answer?: string; // the known answer and solution, when the text came from a question we generated
  questionType?: TQuestionType; // what the source question was, so the type is kept
  prompt?: string;
  thinking?: TThinkingMode;
  model?: string; // a Gemini/Gemma model id; empty means the server default
  variantCount?: number; // 1 to 4; defaults to DEFAULT_VARIANT_COUNT
};

// The model picker in the Generate sheet
export type TAiModel = { id: string; label: string };

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
  // Missing when nothing should change: "manual" could not be verified, and
  // "checked" means the question was already right, so it is left alone rather
  // than replaced with a retyped copy of itself.
  question?: Pick<
    TGeneratedQuestion,
    "text" | "ans" | "needsDiagram" | "needsSolutionDiagram"
  >;
};
