import type { TQuestion, TQuestionStats } from "@/models/Question";

// Difficulty from how students actually did on a question in online tests.
// Bands by share answered right; a question needs MIN_ATTEMPTS before it is
// rated at all (a 1-of-2 is noise, not a difficulty).
export const MIN_ATTEMPTS = 5;
export type TDifficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_BANDS: Record<TDifficulty, { min: number; max: number; label: string }> = {
  easy: { min: 0.7, max: 1.01, label: "Easy" },
  medium: { min: 0.4, max: 0.7, label: "Medium" },
  hard: { min: 0, max: 0.4, label: "Hard" },
};

export const difficultyOf = (stats?: TQuestionStats | null): TDifficulty | null => {
  if (!stats || !(stats.attempts >= MIN_ATTEMPTS) || !Number.isFinite(stats.correctRate)) return null;
  if (stats.correctRate >= DIFFICULTY_BANDS.easy.min) return "easy";
  if (stats.correctRate >= DIFFICULTY_BANDS.medium.min) return "medium";
  return "hard";
};

// Worth a teacher's look: almost nobody gets it right, or weaker students do
// better than stronger ones. Both usually mean a wrong key or a confusing
// question rather than a hard one.
export const SUSPECT_MIN_ATTEMPTS = 10;
export const suspectReason = (stats?: TQuestionStats | null): string | null => {
  if (!stats || !(stats.attempts >= SUSPECT_MIN_ATTEMPTS)) return null;
  if (stats.correctRate < 0.15) return `Only ${Math.round(stats.correctRate * 100)}% get it right`;
  if (stats.discrimination !== null && stats.discrimination < -0.1) return "Weaker students do better than top students";
  return null;
};

export const questionDifficulty = (q?: TQuestion | null) => difficultyOf(q?.stats);
