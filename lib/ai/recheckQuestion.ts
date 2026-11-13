// Server-only: rechecks one generated question with a single model call.
// A variant is solved again without seeing our answer key, so the model works
// it out on its own instead of agreeing with what is already there.
import { generateJson } from "./llm";
import { FORMAT_RULES, formatAnswer } from "./generateVariants";
import type {
  TQuestionType,
  TRecheckRequest,
  TRecheckResponse,
  TRecheckStatus,
} from "./types";

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
- Correct formatting only where it is actually wrong. A question that already renders is left exactly as it is: re-typing maths that was fine is the most common way this step makes a question worse, because a command that lands outside $...$ is then printed to the student as raw backslashes. When you do touch the maths, re-read it against the rendering rules at the end of these instructions.
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

// Medium rather than high: thinking is most of what a recheck costs, and
// medium still solves the question from scratch
const RECHECK_THINKING = "medium";

// The original is a real exam question, so it is not solved again: the only
// thing that can go wrong with it here is the transcription. Comparing text
// against the photo needs little thinking and returns no solution, which is
// where a full recheck spends its tokens.
const TRANSCRIPTION_INSTRUCTION = `You check transcriptions of questions for Indian JEE and NEET coaching.
You receive a question that was transcribed from a real exam paper, and usually the photo it was transcribed from. Do not solve the question and do not judge whether it is correct: only check that the transcription is faithful and renders.

"issues": every transcription or formatting problem, one short sentence each; an empty list if there are none. Look for wrong or missing numbers, units, signs, symbols, subscripts and powers, missing or reordered options, missing sentences, and breaks of the formatting rules below.

"verdict":
- "SOUND" if the transcription matches the photo and follows the formatting rules.
- "FIXED" if you corrected the transcription or its formatting.
- "CANNOT_VERIFY" if the photo is unreadable or does not show this question.
Without a photo, check the formatting only.

"text": for FIXED, the corrected question in full. Copy the photo word for word, keep the option order, and change nothing that was already right: re-typing maths that was fine is the most common way this step breaks a question. For SOUND or CANNOT_VERIFY, an empty string.
"summary": one short sentence for the teacher saying what you checked or corrected.

${FORMAT_RULES}`;

const TRANSCRIPTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    issues: { type: "ARRAY", items: { type: "STRING" } },
    verdict: { type: "STRING", enum: ["SOUND", "FIXED", "CANNOT_VERIFY"] },
    text: { type: "STRING" },
    summary: { type: "STRING" },
  },
  required: ["issues", "verdict", "text", "summary"],
  propertyOrdering: ["issues", "verdict", "text", "summary"],
};

const checkTranscription = async ({
  text,
  questionType,
  image,
  model,
}: TRecheckRequest): Promise<TRecheckResponse> => {
  const raw = await generateJson<RawRecheck>({
    systemInstruction: TRANSCRIPTION_INSTRUCTION,
    parts: [
      ...(image ? [{ inlineData: { mimeType: image.mimeType, data: image.data } }] : []),
      {
        text: `Question type: ${questionType === "NUMERICAL" ? "numerical" : "MCQ"}.\n${
          image ? "The photo it was transcribed from is attached." : "No photo is available."
        }\n\nTranscription to check:\n${text}`,
      },
    ],
    responseSchema: TRANSCRIPTION_SCHEMA,
    thinkingLevel: "low",
    model: model || process.env.GEMINI_RECHECK_MODEL || undefined,
  });

  const issues = (raw.issues ?? []).map((i) => i.trim()).filter(Boolean);
  const summary = raw.summary?.trim() || "";
  const newText = raw.text?.trim();

  if (raw.verdict === "CANNOT_VERIFY") {
    return {
      status: "manual",
      summary: summary || "The transcription could not be checked against the photo.",
      issues,
      transcriptionOnly: true,
    };
  }
  // Sound, or "fixed" into the same text: nothing to apply
  if (raw.verdict !== "FIXED" || !newText || newText === text.trim()) {
    return { status: "checked", summary, issues, transcriptionOnly: true };
  }
  // Only the text changes; the answer and solution the original already has stay
  return {
    status: "question-fixed",
    summary,
    issues,
    transcriptionOnly: true,
    question: { text: newText },
  };
};

export const recheckQuestion = async (request: TRecheckRequest): Promise<TRecheckResponse> => {
  if (request.kind === "original") return checkTranscription(request);

  const { text, answerKey, questionType, originalText, model } = request;
  const context = originalText
    ? `This question is a variant written from the original question below. It must test the same concept at the same difficulty.\n\nOriginal question:\n${originalText}`
    : "";

  const raw = await generateJson<RawRecheck>({
    systemInstruction: SYSTEM_INSTRUCTION,
    parts: [
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
      summary: summary || "The model could not verify this question.",
      issues,
    };
  }

  const changed = !sameAnswer(answerKey, newAnswer, questionType);
  const status: TRecheckStatus =
    raw.verdict === "FIXED" ? "question-fixed" : changed ? "answer-changed" : "checked";

  // A question that came back sound with the answer we already had needs no
  // change, so nothing is sent for the sheet to apply. Replacing good text with
  // a freshly typed copy of itself is how a question picks up maths that no
  // longer renders, and it is a change the teacher never asked for.
  if (status === "checked") {
    return { status, summary, issues };
  }

  // Only the key was wrong: the question itself was sound, so its text is
  // echoed back untouched and only the answer and working change.
  const question = {
    text: status === "question-fixed" ? newText : text,
    ans: `${newAnswer}\n\n${solution}`,
    needsDiagram: !!raw.needsDiagram,
    needsSolutionDiagram: !!raw.needsSolutionDiagram,
  };

  return {
    status,
    summary,
    issues,
    ...(changed ? { previousAnswer: answerKey, newAnswer } : {}),
    question,
  };
};
