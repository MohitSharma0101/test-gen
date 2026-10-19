// Server-only: turns a question photo into the original question plus variants.
import crypto from "crypto";
import { generateJson } from "./gemini";
import type {
  TGenerateVariantsRequest,
  TGenerateVariantsResponse,
  TGeneratedQuestion,
  TQuestionType,
} from "./types";

export const VARIANT_COUNT = 2;

// Shared with the recheck prompt
export const FORMAT_RULES = `Formatting for every "text" and "solution" (it is rendered with Mathpix Markdown):
- Plain Markdown. Write all maths, symbols, units with powers and chemical formulae in LaTeX: inline $...$ and display $$...$$.
- No LaTeX preamble, \\documentclass, \\begin{document}, enumerate or itemize environments, tables of contents, code fences, HTML or images.
- Do not number the question.
- MCQ "text": the question, a blank line, then the four options, each on its own line separated by blank lines, written exactly as \\textbf{(a)} option, \\textbf{(b)} option, \\textbf{(c)} option, \\textbf{(d)} option.

"answer": for an MCQ only the correct option letter, one of a, b, c, d. For a numerical only the final number, without units.
"solution": a detailed step-by-step solution that ends with the final answer.
"needsDiagram": true if the question cannot be understood without a figure. In that case still describe in the text every value a student needs.`;

const SYSTEM_INSTRUCTION = `You are an experienced question setter for Indian JEE and NEET coaching.
You receive a photo of one question. Do two things:
1. Transcribe that question exactly as "original", including its options and the correct answer with a solution.
2. Write exactly ${VARIANT_COUNT} new "variants" that test the same concept at the same difficulty, using different values and, where it helps, a changed scenario. Each variant must be fully solvable and, for MCQs, have exactly one correct option. Make the wrong options plausible.

Keep the question type of the original: an MCQ stays an MCQ with four options; a numerical (integer or decimal answer) stays numerical with no options.

${FORMAT_RULES}`;

const QUESTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    text: { type: "STRING" },
    answer: { type: "STRING" },
    solution: { type: "STRING" },
    needsDiagram: { type: "BOOLEAN" },
  },
  required: ["text", "answer", "solution", "needsDiagram"],
  propertyOrdering: ["text", "answer", "solution", "needsDiagram"],
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    questionType: { type: "STRING", enum: ["MCQ", "NUMERICAL"] },
    original: QUESTION_SCHEMA,
    variants: { type: "ARRAY", items: QUESTION_SCHEMA },
  },
  required: ["questionType", "original", "variants"],
  propertyOrdering: ["questionType", "original", "variants"],
};

type RawQuestion = {
  text?: string;
  answer?: string;
  solution?: string;
  needsDiagram?: boolean;
};

type RawResponse = {
  questionType?: TQuestionType;
  original?: RawQuestion;
  variants?: RawQuestion[];
};

// crack-it checks only the first line of `ans`, so keep it clean:
// "(b\)" for an MCQ, the bare number for a numerical.
export const formatAnswer = (answer: string, type: TQuestionType) => {
  const first = (answer || "").trim().split("\n")[0].trim();
  if (type === "MCQ") {
    const letter = first.replace(/[()\[\]\s.]/g, "").charAt(0).toLowerCase();
    // "(c)" would render as "©", so the closing bracket is escaped
    return /^[a-d]$/.test(letter) ? `(${letter}\\)` : first;
  }
  return first;
};

const toQuestion = (
  raw: RawQuestion | undefined,
  kind: TGeneratedQuestion["kind"],
  type: TQuestionType
): TGeneratedQuestion | null => {
  const text = raw?.text?.trim();
  if (!text) return null;
  const answer = formatAnswer(raw?.answer ?? "", type);
  const solution = raw?.solution?.trim();
  return {
    id: crypto.randomUUID(),
    kind,
    text,
    ans: solution ? `${answer}\n\n${solution}` : answer,
    needsDiagram: !!raw?.needsDiagram,
    diagram: null,
  };
};

export const generateVariants = async ({
  image,
  prompt,
  thinking,
}: TGenerateVariantsRequest): Promise<TGenerateVariantsResponse> => {
  const extra = prompt?.trim();
  const raw = await generateJson<RawResponse>({
    systemInstruction: SYSTEM_INSTRUCTION,
    parts: [
      { inlineData: { mimeType: image.mimeType, data: image.data } },
      {
        text: extra
          ? `Extra instructions from the teacher (follow them unless they break the format rules):\n${extra}`
          : "Generate the original and the variants for this question.",
      },
    ],
    responseSchema: RESPONSE_SCHEMA,
    thinkingLevel: thinking,
  });

  const questionType: TQuestionType = raw.questionType === "NUMERICAL" ? "NUMERICAL" : "MCQ";
  const original = toQuestion(raw.original, "original", questionType);
  const variants = (raw.variants ?? [])
    .slice(0, VARIANT_COUNT)
    .map((v) => toQuestion(v, "variant", questionType))
    .filter((q): q is TGeneratedQuestion => !!q);

  if (variants.length === 0) {
    throw new Error("Gemini didn't return any variants. Try again.");
  }

  return {
    questionType,
    questions: [...(original ? [original] : []), ...variants],
  };
};
