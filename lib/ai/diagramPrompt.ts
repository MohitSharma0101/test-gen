// Builds the prompt a teacher pastes into an image model (ChatGPT, Gemini,
// Grok, whatever they have) to get a diagram for a question or its solution.
//
// Nothing here calls an API. The prompt is assembled from the question text, so
// it is instant, costs no quota, and works with whichever model the teacher
// already pays for - which is the point: the strong image models are not on the
// Gemini free tier this app runs on.
//
// The question text is included verbatim because, after the generate rules on
// self-contained text, it already names every body, length, angle and direction
// the drawing needs.
import type { TGeneratedQuestion, TQuestionType } from "./types";

export type TDiagramKind = "question" | "solution";

// What the drawing has to look like to sit in a printed question paper.
const STYLE_RULES = [
  "Draw it as a clean black-and-white line diagram, the way an Indian JEE or NEET textbook prints it.",
  "White background, black lines, no colour, no shading, no gradients, no 3D rendering, no photorealism.",
  "Flat 2D schematic. Simple shapes: rectangles for blocks, circles for pulleys and bobs, straight lines for strings, rods and rays.",
  "Hatch the ground, walls and fixed supports with short parallel diagonal lines.",
  "Use clear arrowheads for every force, velocity, current or ray direction.",
  "Mark angles with a small arc at the vertex and put the angle value beside the arc.",
  "Label with printed text, in the same symbols and units as the question. Every label must be legible, horizontal, placed just outside the thing it names, and must not overlap any line or other label.",
  "Keep it uncluttered: draw only what the question describes, nothing decorative.",
  "Leave a small white margin around the whole figure.",
  "No title, no caption, no question number, no watermark, no border box around the image.",
];

const QUESTION_RULES = [
  "Draw only what the question states. Do not add anything the question does not mention.",
  "Do not solve the question in the picture: no resultant vectors, no construction lines, no working, no intermediate values.",
  "Do not label or reveal the quantity the question asks the student to find. If it asks for the angle, leave the angle unlabelled.",
  "Label every value the question does give.",
];

const SOLUTION_RULES = [
  "This figure accompanies the worked solution, so it may show the working: free-body arrows, components, construction lines, ray paths and labelled intermediate quantities are all fine.",
  "Show what the written steps refer to, and label the quantities the steps use.",
  "Keep it consistent with the question's own values, symbols and orientation.",
];

const OUTPUT_RULES = [
  "The text below is written in LaTeX. Read it as ordinary notation and letter the figure the normal way: $30^{\\circ}$ is 30 degrees, $4\\,\\text{kg}$ is 4 kg, $v_0$ is v with subscript zero. Never print raw LaTeX such as backslashes or dollar signs in the drawing.",
  "Output: one single image, portrait or landscape as suits the figure, at least 1000 px on its longest side, with a plain white background.",
  "Return only the image. Do not explain it, do not restate the question, and do not describe what you drew.",
];

// The options never affect the drawing, and showing them hands the model the
// candidate answers, so only the stem goes into the prompt.
const STEM_ONLY = /\n\s*\\textbf\{\(a\\?\)\}[\s\S]*$/;

const stem = (text: string) => text.replace(STEM_ONLY, "").trim();

const numbered = (lines: string[], from = 1) =>
  lines.map((line, i) => `${from + i}. ${line}`).join("\n");

// The answer field keeps the answer on line 1 and the solution underneath
const splitAnswer = (ans: string) => {
  const [first, ...rest] = (ans || "").split("\n");
  return { answer: (first || "").trim(), solution: rest.join("\n").trim() };
};

export const diagramPromptTitle = (kind: TDiagramKind) =>
  kind === "question" ? "Question diagram" : "Answer diagram";

export const buildDiagramPrompt = (
  question: Pick<
    TGeneratedQuestion,
    "text" | "ans" | "diagramBrief" | "solutionDiagramBrief"
  >,
  kind: TDiagramKind,
  questionType: TQuestionType
): string => {
  const { solution } = splitAnswer(question.ans);
  const forSolution = kind === "solution";
  // Written while the question was generated. Empty for a question that came
  // from an older run, or where a figure would add nothing.
  const brief = (forSolution ? question.solutionDiagramBrief : question.diagramBrief)?.trim();

  const intro = forSolution
    ? "You are drawing the figure that goes beside the worked solution of a physics, chemistry or maths question from an Indian competitive exam (JEE / NEET)."
    : "You are drawing the figure that goes beside a physics, chemistry or maths question from an Indian competitive exam (JEE / NEET).";

  const rules = [...(forSolution ? SOLUTION_RULES : QUESTION_RULES), ...STYLE_RULES, ...OUTPUT_RULES];

  const sections = [
    intro,
    "",
    `--- QUESTION (${questionType}) ---`,
    stem(question.text),
  ];

  if (forSolution && solution) {
    sections.push("", "--- WORKED SOLUTION THE FIGURE MUST MATCH ---", solution);
  }

  sections.push(
    "",
    "--- WHAT TO DRAW ---",
    brief
      ? // The brief names the objects and their layout; the question above is
        // still there as the authority on the values.
        `${brief}\n\nIf anything here disagrees with the question above, follow the question.`
      : forSolution
        ? "Draw the figure that makes the solution above easy to follow."
        : "Draw the figure described by the question above.",
    "",
    "--- RULES ---",
    numbered(rules)
  );

  return sections.join("\n");
};
