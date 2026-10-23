"use client";

import { Badge } from "./badge";
import { Button } from "./button";
import Markdown from "./markdown";
import TimesUsed from "./times-used";
import { cn } from "@/lib/utils";
import type { TChapter } from "@/models/Chapter";
import type { TQuestion } from "@/models/Question";
import { RefreshCwIcon, XIcon } from "lucide-react";

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
// another from the same chapter, or drop it.
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
    (chapter && typeof chapter !== "string" ? (chapter as TChapter).title : undefined);

  return (
    <li
      className={cn(
        "rounded-lg border border-slate-200 bg-white overflow-hidden transition-opacity",
        swapping && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex gap-2.5 p-3">
        <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center tabular-nums">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 text-sm md:text-base [&_#preview]:!px-0 [&_#preview]:!py-0">
          <Markdown text={question.text ?? ""} />
        </div>
        <Badge variant="outline" className="shrink-0 h-fit tabular-nums">
          {question.mark ?? 1}
        </Badge>
      </div>

      {answerOpen && (
        <div className="mx-3 mb-3 rounded-md border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm [&_#preview]:!px-0 [&_#preview]:!py-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 pb-1">
            Answer
          </p>
          <Markdown text={question.ans ?? ""} />
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-slate-100 bg-slate-50/60 text-xs">
        <span className="truncate text-slate-500 min-w-0">{title ?? "—"}</span>
        <span className="shrink-0 scale-90 origin-left">
          <TimesUsed count={question.timesUsed} />
        </span>
        <div className="ml-auto flex items-center gap-0.5 shrink-0">
          {!answersForced && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={onToggleAnswer}
            >
              {answerOpen ? "Hide" : "Answer"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            title="Swap for another question from this chapter"
            aria-label="Swap question"
            onClick={onSwap}
          >
            <RefreshCwIcon className={cn("w-4 h-4", swapping && "animate-spin")} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-slate-400 hover:text-destructive"
            title="Remove from the paper"
            aria-label="Remove question"
            onClick={onRemove}
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </li>
  );
};

export default GeneratedQuestionCard;
