"use client";

import { memo } from "react";
import { ChevronDownIcon, RefreshCwIcon, XIcon } from "lucide-react";
import Markdown from "./markdown";
import TimesUsed from "./times-used";
import { DifficultyBadge } from "@/components/question-bank/difficulty-badge";
import { cn } from "@/lib/utils";
import type { TChapter } from "@/models/Chapter";
import type { TQuestion } from "@/models/Question";

type Props = {
  question: TQuestion;
  index: number;
  chapterTitle?: string;
  answerOpen: boolean;
  // When every answer is shown from the toolbar, the per-question toggle goes
  // away rather than contradicting it
  answersForced?: boolean;
  swapping?: boolean;
  onToggleAnswer: () => void;
  onSwap: () => void;
  onRemove: () => void;
};

// One question on a generated paper: read it, see its answer, swap it for
// another from the same chapter, or drop it. Same compact look as the Create
// Paper cards.
const GeneratedQuestionCard = ({
  question,
  index,
  chapterTitle,
  answerOpen,
  answersForced,
  swapping,
  onToggleAnswer,
  onSwap,
  onRemove,
}: Props) => {
  const chapter = question.chapter;
  const title =
    chapterTitle ??
    (chapter && typeof chapter !== "string"
      ? (chapter as TChapter).title
      : undefined);

  return (
    // The gap is padding on the <li>, not a margin: in a CSS-columns layout
    // margins were dropped at fragment edges and cards ended up touching
    <li className="defer-offscreen break-inside-avoid pb-2">
      <div
        className={cn(
          "rounded-xl border bg-card p-2.5 text-sm shadow-sm transition-opacity",
          "[&_#preview]:!max-w-full [&_#preview]:!px-0 [&_#preview]:!py-0",
          swapping && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <Markdown text={question.text ?? ""} />
          </div>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <span className="h-fit rounded-md bg-muted px-1.5 py-0.5 text-xs font-bold tabular-nums">
              {question.mark ?? 1}M
            </span>
            <DifficultyBadge stats={question.stats} />
          </span>
        </div>

        {answerOpen && (
          <div className="ml-8 mt-1.5 overflow-x-auto rounded-lg bg-muted/60 px-2 py-1.5 text-muted-foreground">
            <Markdown text={question.ans ?? ""} />
          </div>
        )}

        <div className="ml-8 mt-1 flex items-center gap-1.5 text-xs">
          {!answersForced &&
            (question.ans ? (
              <button
                type="button"
                aria-expanded={answerOpen}
                onClick={onToggleAnswer}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-1.5 font-semibold text-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Answer
                <ChevronDownIcon
                  className={cn(
                    "size-3.5 transition-transform",
                    answerOpen && "rotate-180",
                  )}
                />
              </button>
            ) : (
              <span className="shrink-0 px-1.5 text-muted-foreground">
                No answer
              </span>
            ))}
          <span
            className="min-w-0 truncate text-muted-foreground"
            title={title}
          >
            {title ?? "—"}
          </span>
          <span className="shrink-0" title="Times used in printed papers">
            <TimesUsed count={question.timesUsed} />
          </span>
          <span className="ml-auto flex shrink-0 items-center">
            <button
              type="button"
              title="Swap for another question from this chapter"
              aria-label={`Swap question ${index + 1}`}
              onClick={onSwap}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <RefreshCwIcon
                className={cn("size-4", swapping && "animate-spin")}
              />
            </button>
            <button
              type="button"
              title="Remove from the paper"
              aria-label={`Remove question ${index + 1}`}
              onClick={onRemove}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <XIcon className="size-4" />
            </button>
          </span>
        </div>
      </div>
    </li>
  );
};

export default memo(GeneratedQuestionCard);
