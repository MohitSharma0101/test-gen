"use client";

import { memo, useState } from "react";
import { CheckIcon, ChevronDownIcon, HashIcon, MoreHorizontalIcon, PenLineIcon, TagIcon } from "lucide-react";
import Markdown from "@/components/ui/markdown";
import TimesUsed from "@/components/ui/times-used";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TQuestion } from "@/models/Question";
import { cn } from "@/lib/utils";

export type TQuestionAction = "question" | "answer" | "tags" | "marks";

type Props = {
  question: TQuestion;
  number: number;
  selected: boolean;
  onToggle: (question: TQuestion) => void;
  onAction: (question: TQuestion, action: TQuestionAction) => void;
  // Question bank page: marks can be changed from the menu too
  canChangeMarks?: boolean;
};

// The whole card picks/unpicks the question (one big target instead of a
// 16px checkbox); edits live behind ⋯. Answers start folded so more
// questions fit on screen.
const QuestionCard = ({ question: q, number, selected, onToggle, onAction, canChangeMarks }: Props) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const tags = (q.tags ?? []).filter(Boolean);
  return (
    <li className="defer-offscreen">
      <div
        role="checkbox"
        aria-checked={selected}
        aria-label={`Question ${number}`}
        tabIndex={0}
        onClick={(e) => {
          // Taps on links and the card's own buttons shouldn't toggle
          if ((e.target as HTMLElement).closest("a,[data-no-toggle]")) return;
          onToggle(q);
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onToggle(q);
          }
        }}
        className={cn(
          "flex cursor-pointer gap-2 rounded-xl border bg-card p-2.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          selected ? "border-brand bg-brand-soft/40 ring-1 ring-brand" : "hover:border-brand/40",
          "[&_#preview]:!max-w-full [&_#preview]:!px-0 [&_#preview]:!py-0"
        )}
      >
        <span className="flex w-6 shrink-0 flex-col items-center gap-1 pt-0.5">
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full border-2 transition-colors",
              selected ? "border-brand bg-brand text-brand-foreground" : "border-muted-foreground/40 bg-background"
            )}
            aria-hidden="true"
          >
            {selected && <CheckIcon className="size-3" strokeWidth={3} />}
          </span>
          <span className="text-[11px] tabular-nums text-muted-foreground">{number}</span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="overflow-x-auto">
            <Markdown text={q.text ?? ""} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {q.ans ? (
              <button
                type="button"
                data-no-toggle
                aria-expanded={showAnswer}
                onClick={() => setShowAnswer((v) => !v)}
                className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs font-semibold text-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Answer
                <ChevronDownIcon className={cn("size-3.5 transition-transform", showAnswer && "rotate-180")} />
              </button>
            ) : (
              <span className="px-1.5 text-xs text-muted-foreground">No answer</span>
            )}
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
          {showAnswer && q.ans && (
            <div className="mt-1 overflow-x-auto rounded-lg bg-muted/60 px-2 py-1.5 text-muted-foreground" data-no-toggle>
              <Markdown text={q.ans} />
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1" data-no-toggle onClick={(e) => e.stopPropagation()}>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-bold tabular-nums">{q.mark ?? "?"}M</span>
          <span className="text-xs" title="Times used in printed papers">
            <TimesUsed count={q.timesUsed} />
          </span>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              aria-label={`More for question ${number}`}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onAction(q, "question")} className="gap-2">
                <PenLineIcon className="size-4" /> Edit question
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction(q, "answer")} className="gap-2">
                <PenLineIcon className="size-4" /> {q.ans ? "Edit answer" : "Add answer"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction(q, "tags")} className="gap-2">
                <TagIcon className="size-4" /> Tags
              </DropdownMenuItem>
              {canChangeMarks && (
                <DropdownMenuItem onSelect={() => onAction(q, "marks")} className="gap-2">
                  <HashIcon className="size-4" /> Change marks
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
};

export default memo(QuestionCard);
