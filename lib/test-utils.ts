import { QuestionAnalyze, TAG } from "@/data/const";
import { TAnalysedQuestion, TAnswer, TAnswerSheet } from "@/models/AnswerSheet";
import { TQuestion } from "@/models/Question";

// sync
export const normalizeAnswer = (ans?: string, isNotMCQ?: boolean): string => {
  if (!ans) return "";

  // Take only first line (ignore explanation after newline)
  let firstLine = ans?.split("\n")?.[0]?.trim().toLowerCase();

  if (!isNotMCQ) {
    firstLine = firstLine.slice(0, 2);
  }

  // Remove brackets and spaces
  const clean = firstLine.replace(/[\(\)\[\]\{\}]/g, "").trim();

  if (isNotMCQ) return clean.toLowerCase();

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

// sync
export const analyseTest = (questions: TQuestion[], answers: TAnswer[]) => {
  let correctAns = 0;
  let incorrectAns = 0;
  let skippedAns = 0;
  let totalMarks = 0;
  let obtainedMarks = 0;

  // Map of questionId => user answer
  const answerMap = new Map(answers.map((ans) => [String(ans.question), ans]));

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

    const normalizedCorrect = normalizeAnswer(
      question.ans,
      isNumerical(question)
    );
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
    analysedAns, // only answered questions
    correctAns,
    incorrectAns,
    skippedAns,
    totalMarks,
    obtainedMarks,
  };
};

export function analyzeQuestions(
  answerSheets: TAnswerSheet<true>[],
  options?: {
    threshold?: number;
    analyzeOn?: QuestionAnalyze;
    topN?: number;
  }
): TAnalysedQuestion[] {
  const { threshold = 0.5, analyzeOn, topN } = options || {};

  if (!answerSheets || answerSheets.length === 0) return [];

  // Flatten all responses
  const allResponses = answerSheets.flatMap((a) => a.answers);

  // Aggregate per question
  const summary: Record<
    string,
    { total: number; incorrect: number; totalTime: number; question: TQuestion }
  > = {};
  for (const r of allResponses) {
    const q = (summary[String(r.question._id)] ||= {
      total: 0,
      incorrect: 0,
      totalTime: 0,
      question: r.question,
    });
    q.total++;
    q.totalTime += r.timeSpent;
    if (!r.isCorrect) q.incorrect++;
  }

  // Compute stats
  const stats: TAnalysedQuestion[] = Object.entries(summary).map(([id, s]) => ({
    question: s.question,
    incorrectRate: s.incorrect / s.total,
    avgTimeSpent: s.totalTime / s.total,
    normalizedTime: 0, // will calculate next
    attempts: s.total,
  }));

  // Normalize avgTimeSpent
  const maxTime = Math.max(...stats.map((q) => q.avgTimeSpent));
  const minTime = Math.min(...stats.map((q) => q.avgTimeSpent));
  const range = maxTime - minTime || 1;

  for (const q of stats) {
    q.normalizedTime = (q.avgTimeSpent - minTime) / range;
  }

  // Filter by threshold
  let filtered: TAnalysedQuestion[] = [];
  switch (analyzeOn) {
    case QuestionAnalyze.INCORRECT: {
      filtered = stats
        .filter((q) => q.incorrectRate >= threshold)
        .sort((a, b) => b.incorrectRate - a.incorrectRate);
      break;
    }
    case QuestionAnalyze.TIME_SPENT: {
      filtered = stats
        .filter((q) => q.normalizedTime >= threshold)
        .sort((a, b) => b.normalizedTime - a.normalizedTime);
      break;
    }
  }
  // Apply topN limit if provided
  if (topN) filtered = filtered.slice(0, topN);

  return filtered;
}

// sync
export const isNumerical = (question?: TQuestion): boolean => {
  return question?.tags?.includes(TAG.NUMERICAL) ?? false;
};
