"use client";

import React, { useState } from "react";
import { ChartColumnIcon, CopyIcon, TimerIcon, XIcon } from "lucide-react";
import { useQuestionAnalyzer } from "@/hooks/useQuestionAnalyzer";
import Markdown from "../ui/markdown";
import Clock from "@/lib/clock";
import { Button } from "../ui/button";
import { cn, copyToClipboard } from "@/lib/utils";
import PreviewButton from "../ui/preview-button-v2";
import { QuestionAnalyze, QuestionAnalyzeOptions, Threshold, ThresholdOptions } from "@/data/const";
import SelectCompact from "../ui/select-compact";
import { Skeleton } from "../ui/skeleton";
import { DocumentWindow } from "../ui/document-window";
import { EmptyState, ErrorState } from "../ui/state-message";
import { ROUTE_GROUPS } from "@/data/routes";

type Props = {
  open: boolean;
  scheduleId: string;
  title?: string;
  onOpenChange: (open: boolean) => void;
};

// The questions a batch found hardest in one test: the most often answered
// wrong, or the slowest, above a threshold. The set can be previewed and
// printed as a paper for revision.
const QuestionAnalyzerSheet = ({ title = "Question analysis", open, scheduleId, onOpenChange }: Props) => {
  const [threshold, setThreshold] = useState(Threshold.FIVE);
  const [analyzeOn, setAnalyzeOn] = useState(QuestionAnalyze.INCORRECT);
  const { questions, loading, error } = useQuestionAnalyzer({ scheduleId, threshold, analyzeOn });

  const list = questions ?? [];
  const byTime = analyzeOn === QuestionAnalyze.TIME_SPENT;

  const body = () => {
    if (loading && list.length === 0) {
      return (
        <div className="mx-auto max-w-3xl space-y-3 p-4" aria-busy="true" aria-label="Loading analysis">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      );
    }
    if (error || !questions) {
      return <ErrorState message="Couldn't analyse this test." className="py-12" />;
    }
    if (list.length === 0) {
      return (
        <EmptyState
          className="py-12"
          tone={ROUTE_GROUPS.daily.tile}
          icon={<ChartColumnIcon />}
          title="No questions above this threshold"
          description="Try a lower threshold, or wait for more students to submit."
        />
      );
    }
    return (
      <ol className={cn("mx-auto max-w-3xl space-y-3 p-4", loading && "opacity-60 transition-opacity")}>
        {list.map((q, index) => (
          <li key={q.question?._id ?? index} className="defer-offscreen overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <span className="text-sm font-bold">Q{index + 1}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                  byTime ? "bg-muted text-muted-foreground" : "bg-red-50 text-red-700"
                )}
                title="Share of students who answered it wrong"
              >
                <XIcon className="size-3.5" aria-hidden="true" />
                {Math.floor((q.incorrectRate ?? 0) * 100)}% wrong
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                  byTime ? "bg-amber-50 text-amber-800" : "bg-muted text-muted-foreground"
                )}
                title="Average time spent on it"
              >
                <TimerIcon className="size-3.5" aria-hidden="true" />
                {Clock.getTimeInFormat2(q.avgTimeSpent)}
              </span>
              <Button
                variant="ghost"
                onClick={() => copyToClipboard(q.question?.text)}
                aria-label={`Copy question ${index + 1}`}
                title="Copy question text"
                className="ml-auto size-8 shrink-0 p-0"
              >
                <CopyIcon className="size-4" />
              </Button>
            </div>
            <div className="overflow-x-auto px-1">
              <Markdown text={q.question?.text ?? ""} />
            </div>
          </li>
        ))}
      </ol>
    );
  };

  return (
    <DocumentWindow
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        questions
          ? `${list.length} question${list.length === 1 ? "" : "s"} ${byTime ? "took the longest" : "were answered wrong most often"}`
          : "The questions students found hardest"
      }
      toolbar={
        <div className="flex flex-wrap items-end gap-2">
          <SelectCompact
            label="Hardest by"
            options={QuestionAnalyzeOptions}
            value={analyzeOn}
            onChange={(value) => setAnalyzeOn(value as QuestionAnalyze)}
            className="w-36"
          />
          <SelectCompact
            label="Threshold"
            options={ThresholdOptions}
            value={threshold}
            onChange={(value) => setThreshold(value as Threshold)}
            className="w-28"
          />
          <PreviewButton
            variant="brand"
            questions={list.map((q) => q.question).filter(Boolean)}
            defaultTwoColumn
            className="ml-auto h-10"
          />
        </div>
      }
      bodyClassName="bg-muted/40"
    >
      {body()}
    </DocumentWindow>
  );
};

export default QuestionAnalyzerSheet;
