// Server-only: rechecks one generated question with a single Gemini call.
// Gemini never sees our answer key, so it solves the question on its own
// instead of agreeing with what is already there.
import { generateJson } from "./gemini";
import { FORMAT_RULES, formatAnswer } from "./generateVariants";
import type { TQuestionType, TRecheckRequest, TRecheckResponse } from "./types";

const SYSTEM_INSTRUCTION = `You are a senior examiner who reviews questions for Indian JEE and NEET coaching before they are given to students.
You receive ONE question without its answer key. Work through these fields in order:

"analysis": the subject, chapter and topic, the question format (single-correct MCQ, assertion-reason, match the column, statement based, numerical, or more than one correct option), what is being asked, and the concepts and depth needed to answer it.

"issues": every problem you find in the question as given, one short sentence each; an empty list if there are none. Check that:
- it is well-posed: all the data needed is given, nothing contradicts, and the values are physically or chemically realistic;
- it is actually solvable at the level of the exam;
- an MCQ has exactly one correct option, no two options are equal, and the wrong options are plausible;
- a numerical has a clean final value at sensible precision;
- units, signs and notation are consistent;
- the formatting rules below are followed.

"verdict":
- "SOUND" if the question is correct and solvable (formatting slips alone still count as SOUND).
- "FIXED" if the question itself is wrong or unsolvable and you have rewritten it.
- "CANNOT_VERIFY" if you cannot check it reliably, for example it depends on a figure you cannot see, or it has more than one correct option.

"text": the final question.
- SOUND: the question as given, with only formatting corrected. Do not change its meaning, values, options or option order.
- FIXED: the corrected question. Keep the same question type, concept and difficulty, and change as little as possible.
- CANNOT_VERIFY: the question as given.

"solution": your own detailed step-by-step solution of the final "text", written from scratch, ending with the final answer. Double-check every calculation.
"answer": the correct answer to the final "text".
"summary": one short sentence for the teacher saying what you checked or changed.

${FORMAT_RULES}`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    analysis: { type: "STRING" },
    issues: { type: "ARRAY", items: { type: "STRING" } },
    verdict: { type: "STRING", enum: ["SOUND", "FIXED", "CANNOT_VERIFY"] },
    text: { type: "STRING" },
    solution: { type: "STRING" },
    answer: { type: "STRING" },
    needsDiagram: { type: "BOOLEAN" },
    needsSolutionDiagram: { type: "BOOLEAN" },
    summary: { type: "STRING" },
  },
  required: ["analysis", "issues", "verdict", "text", "solution", "answer", "needsDiagram", "needsSolutionDiagram", "summary"],
  propertyOrdering: ["analysis", "issues", "verdict", "text", "solution", "answer", "needsDiagram", "needsSolutionDiagram", "summary"],
};

type RawRecheck = {
  issues?: string[];
  verdict?: "SOUND" | "FIXED" | "CANNOT_VERIFY";
  text?: string;
  solution?: string;
  answer?: string;
  needsDiagram?: boolean;
  needsSolutionDiagram?: boolean;
  summary?: string;
};

// "(b\)" -> "b", " 2.50 " -> "2.5"
const normalise = (answer: string, type: TQuestionType) => {
  const first = (answer || "").trim().split("\n")[0].trim();
  if (type === "MCQ") return first.replace(/[()\[\]\\\s.]/g, "").toLowerCase();
  return first.replace(/\s/g, "");
};

const sameAnswer = (a: string, b: string, type: TQuestionType) => {
  const x = normalise(a, type);
  const y = normalise(b, type);
  if (type === "MCQ") return x === y;
  const nx = Number(x);
  const ny = Number(y);
  if (Number.isFinite(nx) && Number.isFinite(ny)) {
    return Math.abs(nx - ny) <= Math.max(1e-6, 0.01 * Math.abs(ny));
  }
  return x === y;
};

const RECHECK_THINKING = "high";

export const recheckQuestion = async ({
  text,
  answerKey,
  questionType,
  kind,
  originalText,
  image,
  model,
}: TRecheckRequest): Promise<TRecheckResponse> => {
  const context =
    kind === "original"
      ? image
        ? "This question was transcribed from the attached photo. If the transcription differs from the photo, correct it to match the photo; otherwise never change the question's wording or values."
        : "This question was transcribed from a photo of a real exam question. Never change its wording or values; only fix formatting."
      : originalText
        ? `This question is a variant written from the original question below. It must test the same concept at the same difficulty.\n\nOriginal question:\n${originalText}`
        : "";

  const raw = await generateJson<RawRecheck>({
    systemInstruction: SYSTEM_INSTRUCTION,
    parts: [
      ...(image ? [{ inlineData: { mimeType: image.mimeType, data: image.data } }] : []),
      {
        text: `Question type: ${questionType === "NUMERICAL" ? "numerical" : "MCQ"}.\n${context}\n\nQuestion to review:\n${text}`,
      },
    ],
    responseSchema: RESPONSE_SCHEMA,
    thinkingLevel: RECHECK_THINKING,
    model: model || process.env.GEMINI_RECHECK_MODEL || undefined,
  });

  const issues = (raw.issues ?? []).map((i) => i.trim()).filter(Boolean);
  const summary = raw.summary?.trim() || "";
  const newText = raw.text?.trim();
  const solution = raw.solution?.trim();
  const newAnswer = formatAnswer(raw.answer ?? "", questionType);

  if (raw.verdict === "CANNOT_VERIFY" || !newText || !solution || !newAnswer) {
    return {
      status: "manual",
      summary: summary || "Gemini could not verify this question.",
      issues,
    };
  }

  const question = {
    text: newText,
    ans: `${newAnswer}\n\n${solution}`,
    needsDiagram: !!raw.needsDiagram,
    needsSolutionDiagram: !!raw.needsSolutionDiagram,
  };
  const changed = !sameAnswer(answerKey, newAnswer, questionType);

  return {
    status:
      raw.verdict === "FIXED" ? "question-fixed" : changed ? "answer-changed" : "checked",
    summary,
    issues,
    ...(changed ? { previousAnswer: answerKey, newAnswer } : {}),
    question,
  };
};
