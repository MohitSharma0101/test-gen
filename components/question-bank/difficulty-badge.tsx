import { difficultyOf, DIFFICULTY_BANDS } from "@/lib/difficulty";
import type { TQuestionStats } from "@/models/Question";
import { cn } from "@/lib/utils";

const TONE = {
  easy: "bg-emerald-50 text-emerald-800",
  medium: "bg-amber-50 text-amber-800",
  hard: "bg-red-50 text-red-700",
} as const;

// Measured difficulty from online tests, with the share who got it right.
// Nothing for questions without enough attempts yet.
export const DifficultyBadge = ({ stats, className }: { stats?: TQuestionStats | null; className?: string }) => {
  const d = difficultyOf(stats);
  if (!d || !stats) return null;
  return (
    <span
      className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", TONE[d], className)}
      title={`${stats.correct} of ${stats.attempts} students answered it right in online tests`}
    >
      {DIFFICULTY_BANDS[d].label} · {Math.round(stats.correctRate * 100)}%
    </span>
  );
};
