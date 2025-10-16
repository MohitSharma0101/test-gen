import { TAnswer } from "@/models/AnswerSheet";
import { TQuestion } from "@/models/Question";


export const normalizeAnswer = (ans?: string): string => {
  if (!ans) return "";

  // Take only first line (ignore explanation after newline)
  const firstLine = ans?.split("\n")?.[0]?.slice(0, 2)?.trim().toLowerCase();

  // Remove brackets and spaces
  const clean = firstLine.replace(/[\(\)\[\]\{\}]/g, "").trim();

  // Map A/a -> 1, etc.
  const mapping: Record<string, string> = {
    a: "opt-1",
    b: "opt-2",
    c: "opt-3",
    d: "opt-4",
    "1": "opt-1",
    "2": "opt-2",
    "3": "opt-3",
    "4": "opt-4",
  };

  return mapping[clean.toLowerCase()] || clean.toLowerCase();
};

export const analyseTest = (questions: TQuestion[], answers: TAnswer[]) => {
  let correctAns = 0;
  let incorrectAns = 0;
  let skippedAns = 0;
  let totalMarks = 0;
  let obtainedMarks = 0;

  // Map of questionId => user answer
  const answerMap = new Map(
    answers.map((ans) => [String(ans.question), ans])
  );

  const analysedAns: TAnswer[] = [];

  for (const question of questions) {
    const qid = String(question._id);
    const mark = question.mark ?? 0;
    totalMarks += mark;

    const userAnswer = answerMap.get(qid);

    // If there's no answer object, count as skipped
    if (!userAnswer || !userAnswer.answer?.trim()) {
      skippedAns++;
      continue;
    }

    const normalizedCorrect = normalizeAnswer(question.ans);
    const userAns = userAnswer.answer.trim();
    const isCorrect = userAns === normalizedCorrect;

    if (isCorrect) {
      correctAns++;
      obtainedMarks += mark;
    } else {
      incorrectAns++;
      obtainedMarks -= 1; // Hardcoded negative marking
    }

    analysedAns.push({
      ...userAnswer,
      isCorrect,
    });
  }

  return {
    analysedAns,      // only answered questions
    correctAns,
    incorrectAns,
    skippedAns,
    totalMarks,
    obtainedMarks,
  };
};

