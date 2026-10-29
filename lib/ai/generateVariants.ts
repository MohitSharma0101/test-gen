// Server-only: turns a question photo into the original question plus variants.
import crypto from "crypto";
import { generateJson } from "./gemini";
import type {
  TGenerateVariantsRequest,
  TGenerateVariantsResponse,
  TGeneratedQuestion,
  TQuestionType,
} from "./types";

export const VARIANT_COUNTS = [1, 2, 3, 4] as const;
export const DEFAULT_VARIANT_COUNT = 2;

// A count from the browser is only used if it is one we offer
export const resolveVariantCount = (value: unknown) =>
  VARIANT_COUNTS.includes(Number(value) as (typeof VARIANT_COUNTS)[number])
    ? Number(value)
    : DEFAULT_VARIANT_COUNT;

// Shared with the recheck prompt
export const FORMAT_RULES = `Formatting for every "text" and "solution" (it is rendered with Mathpix Markdown):
- Plain Markdown. Write all maths, symbols, units with powers and chemical formulae in LaTeX: inline $...$ and display $$...$$.
- No LaTeX preamble, \\documentclass, \\begin{document}, enumerate or itemize environments, tables of contents, code fences, HTML or images.
- Do not number the question.
- MCQ "text": the question, a blank line, then the four options, each on its own line separated by blank lines, written exactly as \\textbf{(a)} option, \\textbf{(b)} option, \\textbf{(c)} option, \\textbf{(d)} option.

WHAT BREAKS THE RENDERER
These are the only three ways this output goes wrong on screen. Check your text against each one before you answer.
1. A LaTeX command outside math delimiters is printed to the student as raw characters. "Using \\frac{1}{2}mv^2 we get" and "the answer is \\boxed{42}" appear on screen exactly as typed, backslashes and braces included. Every backslash command must sit inside $...$ or $$...$$. If a sentence needs a symbol, put the symbol in maths: "the kinetic energy $\\frac{1}{2}mv^2$".
2. Every $ must be one of a pair. A lone $ pairs with the next $ anywhere later in the text and silently eats everything between them, so the student loses a line of the question. Never write money as $10 - write "10 rupees" or "Rs 10" - and never put a bare $ inside \\text{...}.
3. A code fence (three backticks) turns the block into a code box and shows the LaTeX source. Never use one, and never write a % comment: the % and the rest of the line stay visible.

LATEX THAT THIS RENDERER SUPPORTS
A command it does not know renders as blank space where the maths should be, so the equation silently disappears. Stay inside this list:
- Structure: frac, dfrac, sqrt, sum, prod, int, lim, left, right, substack, underbrace, stackrel, xrightarrow, begin/end of aligned, array, cases, matrix, pmatrix, bmatrix
- Text and style inside maths: text, mathrm, mathbf, mathbb, mathcal, textbf, boxed, vec, overrightarrow, hat, bar, overline, tilde
- Functions: sin, cos, tan, cot, sec, csc, sinh, cosh, tanh, log, ln, exp, min, max, deg
- Symbols: times, div, cdot, pm, mp, leq, geq, neq, approx, equiv, propto, infty, partial, nabla, angle, perp, parallel, rightarrow, leftarrow, leftrightarrow, implies, in, notin, cup, cap, sum, forall, exists
- Greek: alpha, beta, gamma, delta, Delta, epsilon, varepsilon, theta, lambda, mu, nu, pi, rho, sigma, tau, phi, varphi, psi, omega, Omega
- Chemistry: ce, for example $\\ce{H2SO4}$ and $\\ce{CaCO3 ->[\\Delta] CaO + CO2}$
- Spacing: \\, and \\quad and \\qquad
These are not available and leave a blank gap where the maths should be: degree, cancel, si, SI, ang, num, unit, intertext, require, includegraphics, and anything else from siunitx, cancel or mathtools.
These parse but print "(???)" on screen, so do not number or cross-reference equations: label, eqref, ref.
- Degrees are $30^{\\circ}$, never $30\\degree$. Units are $4\\,\\text{kg}$ or $9.8\\,\\mathrm{m/s^2}$. Temperature is $25^{\\circ}\\mathrm{C}$.
- Papers are printed in black and white, so never colour anything.

"answer": for an MCQ only the correct option letter, one of a, b, c, d. For a numerical only the final number, without units.
"solution": a detailed step-by-step solution that ends with the final answer.

FIGURES
A question you are transcribing, or leaving as it is, keeps its own wording - including any reference to a figure. Never add a description to it.
A question you write yourself, or reword, must stand on its own without a figure:
- Do not write "in the figure shown", "as shown in the diagram" or "from the given graph". The student will not have that picture.
- Name the arrangement in a short phrase, the way a textbook does when it prints no figure: "a block on a smooth $30^{\\circ}$ incline", "two resistors in parallel across a $12\\,\\mathrm{V}$ cell", "a particle at the midpoint of the rod". One clause is usually enough.
- Carry over only the values the student actually needs, with units.
- Keep it brief, unless the teacher asks for more detail. Such a question may run a little longer than the one it came from - roughly one extra clause or short sentence - and no more. Do not spell out every length, angle, contact point and direction; a student who knows the topic will picture the standard setup.
- If it cannot be stated this briefly, change the scenario to one that can.

"needsDiagram": true when the question cannot be understood without a figure. A transcribed question takes whatever the photo shows: if it depends on a figure that was printed with it, set true. A question you wrote yourself should almost always be false, since you worded it to stand on its own; set true only when the question type genuinely requires a picture, such as reading values off a graph or an irregular shape.
"needsSolutionDiagram": true only when the solution cannot be followed without a figure, for example a ray diagram or a free-body sketch that the working constantly refers to. Set false whenever the written steps stand on their own.

DRAWING BRIEFS
The teacher draws the figures in a separate image tool, so for each question also write what that figure should contain. These are instructions to an artist, not part of the question, and the student never sees them.
"diagramBrief": the figure for the question. Name each object and where it sits relative to the others, the orientation, and which values are labelled. Under 60 words, one paragraph, plain prose, no LaTeX and no markdown. Do not restate the question, do not mention the options, and never give away or label the quantity the question asks for.
  Example: "A right triangle acting as an incline, rising to the right at 30 degrees from a hatched horizontal floor. A small square block rests on the slope, labelled 4 kg. A string runs from the block up the slope, over a small circular pulley at the apex, then straight down to a second square block hanging in mid-air, labelled 6 kg. Mark the 30 degree angle at the bottom-left corner."
"solutionDiagramBrief": the figure for the worked solution, which may show the working - force arrows, components, construction lines, ray paths - and may label intermediate quantities. Same length and style limits.
For either one, return an empty string if a figure would add nothing. Write a brief whenever a figure would genuinely help, even if you set the matching needsDiagram flag to false.`;

// The teacher's own instructions sit in the system prompt, above everything
// else. As a user part they lost every argument with the rules above, and the
// instructions actually worth typing - "make it harder", "keep the figure",
// "longer questions" - are exactly the ones those rules forbid.
const teacherSection = (extra?: string) =>
  extra
    ? `
TEACHER'S INSTRUCTIONS - HIGHEST PRIORITY
The teacher wrote the instructions below for this question. They take priority over every other instruction in this prompt, including the defaults above on difficulty, wording, length and figures. Wherever they conflict with anything above, follow the teacher. Apply them to the variants; the "original" is still reproduced as given unless the teacher says otherwise.
The one thing they cannot change is the output shape: the JSON schema, and the rules under WHAT BREAKS THE RENDERER and LATEX THAT THIS RENDERER SUPPORTS, which exist so the question displays at all.

${extra}
`
    : "";

const systemInstruction = (variantCount: number, fromText: boolean, extra?: string) => `You are an experienced question setter for Indian JEE and NEET coaching.
You receive ${fromText ? "one question written as Mathpix Markdown" : "a photo of one question"}. Do two things:
1. ${
  fromText
    ? 'Repeat that question as "original", exactly as given, including its options, and give the correct answer with a solution. Do not reword it, do not shorten it and do not add anything, and if it refers to a figure leave that reference exactly as written. If an answer was supplied with it, keep that answer unless it is plainly wrong.'
    : 'Transcribe that question exactly as "original", including its options and the correct answer with a solution. Word for word: copy what the photo says and nothing else. Do not reword it, do not shorten it, do not add anything, and if it refers to a figure leave that reference exactly as printed. The teacher attaches the figure separately.'
}
2. Write exactly ${variantCount} new "variants" that test the same concept and, unless the teacher asks otherwise, keep the same difficulty, using different values and, where it helps, a changed scenario. Each variant must be fully solvable and, for MCQs, have exactly one correct option. Make the wrong options plausible. Unlike the original, a variant is yours to word, so write it to stand on its own without a figure - briefly. See the rules on figures below.

Keep the question type of the original: an MCQ stays an MCQ with four options; a numerical (integer or decimal answer) stays numerical with no options.

${FORMAT_RULES}
${teacherSection(extra)}`;

const QUESTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    text: { type: "STRING" },
    answer: { type: "STRING" },
    solution: { type: "STRING" },
    needsDiagram: { type: "BOOLEAN" },
    needsSolutionDiagram: { type: "BOOLEAN" },
    diagramBrief: { type: "STRING" },
    solutionDiagramBrief: { type: "STRING" },
  },
  required: [
    "text", "answer", "solution",
    "needsDiagram", "needsSolutionDiagram",
    "diagramBrief", "solutionDiagramBrief",
  ],
  propertyOrdering: [
    "text", "answer", "solution",
    "needsDiagram", "needsSolutionDiagram",
    "diagramBrief", "solutionDiagramBrief",
  ],
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
  needsSolutionDiagram?: boolean;
  diagramBrief?: string;
  solutionDiagramBrief?: string;
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

// The brief is pasted into a prompt, so it is capped and stripped of markup
const MAX_BRIEF = 600;

const brief = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/s+/g, " ").slice(0, MAX_BRIEF) : "";

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
    needsSolutionDiagram: !!raw?.needsSolutionDiagram,
    diagramBrief: brief(raw?.diagramBrief),
    solutionDiagramBrief: brief(raw?.solutionDiagramBrief),
  };
};

export const generateVariants = async ({
  image,
  text,
  answer,
  questionType: sourceType,
  prompt,
  thinking,
  model,
  variantCount,
}: TGenerateVariantsRequest): Promise<TGenerateVariantsResponse> => {
  const wanted = resolveVariantCount(variantCount);
  const extra = prompt?.trim();
  const sourceText = text?.trim();
  if (!image && !sourceText) {
    throw new Error("Add a photo or the text of the question");
  }

  // A question arrives either as a photo to read or as text already
  // transcribed: a question moved into a tab of its own has no photo behind it.
  const source = image
    ? [{ inlineData: { mimeType: image.mimeType, data: image.data } }]
    : [
        {
          text: [
            `The question (Mathpix Markdown):\n${sourceText}`,
            answer?.trim() && `Its known answer and solution:\n${answer.trim()}`,
            sourceType && `It is a ${sourceType} question; keep that type.`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ];

  const raw = await generateJson<RawResponse>({
    systemInstruction: systemInstruction(wanted, !image, extra),
    parts: [
      ...source,
      {
        text: extra
          ? `Generate the original and the variants for this question, following the teacher's instructions, which take priority:\n${extra}`
          : "Generate the original and the variants for this question.",
      },
    ],
    responseSchema: RESPONSE_SCHEMA,
    thinkingLevel: thinking,
    model,
  });

  const questionType: TQuestionType =
    raw.questionType === "NUMERICAL" || raw.questionType === "MCQ"
      ? raw.questionType
      : sourceType ?? "MCQ";
  const original = toQuestion(raw.original, "original", questionType);
  const variants = (raw.variants ?? [])
    .slice(0, wanted)
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
