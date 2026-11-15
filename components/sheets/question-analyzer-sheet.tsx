"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChartColumnIcon, CopyIcon, SparklesIcon, TimerIcon, WandSparklesIcon, XIcon } from "lucide-react";
import { sendToVariants } from "@/lib/variantHandoff";
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
import { writePracticePrefill } from "@/lib/practicePrefill";
import type { TChapter } from "@/models/Chapter";

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

  const list = useMemo(() => questions ?? [], [questions]);
  const byTime = analyzeOn === QuestionAnalyze.TIME_SPENT;
  const router = useRouter();

  // The chapters the hard questions come from, most hard questions first
  const weakChapters = useMemo(() => {
    const map = new Map<string, { chapter: TChapter; count: number; wrong: number }>();
    for (const q of list) {
      const ch = q.question?.chapter;
      if (!ch || typeof ch !== "object" || !(ch as TChapter)._id) continue;
      const c = ch as TChapter;
      const entry = map.get(c._id) ?? { chapter: c, count: 0, wrong: 0 };
      entry.count += 1;
      entry.wrong += q.incorrectRate ?? 0;
      map.set(c._id, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || b.wrong - a.wrong);
  }, [list]);

  // Open Generate Paper with these chapters picked, grouped by subject
  const practice = () => {
    const chapters: Record<string, string[]> = {};
    for (const { chapter } of weakChapters) {
      const subject = chapter.subject || "";
      (chapters[subject] ??= []).push(chapter._id);
    }
    const course = weakChapters.find((w) => w.chapter.course)?.chapter.course ?? "";
    // Navigate without closing first: closing would make the back-button
    // handler pop its history entry before the URL changed, undoing the push.
    // The window goes away with this page.
    if (writePracticePrefill({ course, chapters, source: title })) router.push("/generate-paper");
  };

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
      <>
      {weakChapters.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pt-4" aria-labelledby="weak-chapters">
          <div className="rounded-xl border border-brand/30 bg-brand-soft/60 p-3">
            <h3 id="weak-chapters" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Weak chapters
            </h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {weakChapters.map(({ chapter, count }) => (
                <li key={chapter._id} className="rounded-full bg-card px-2.5 py-1 text-xs font-medium shadow-sm">
                  {chapter.title || "Chapter"}
                  {chapter.subject ? <span className="text-muted-foreground"> · {chapter.subject}</span> : null}
                  <span className="ml-1 font-bold tabular-nums text-red-700">{count}</span>
                </li>
              ))}
            </ul>
            <Button variant="brand" className="mt-3 h-10 gap-2" onClick={practice}>
              <WandSparklesIcon className="size-4" />
              Practice paper from {weakChapters.length === 1 ? "this chapter" : `these ${weakChapters.length} chapters`}
            </Button>
          </div>
        </section>
      )}
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
                onClick={() => q.question && sendToVariants(q.question, router, `Q${index + 1}`)}
                className="ml-auto h-8 gap-1.5 px-2 text-brand"
                title="Make new questions like this one on the Variants page"
              >
                <SparklesIcon className="size-4" /> <span className="hidden sm:inline">Variant</span>
                <span className="sr-only sm:hidden">Generate variant of question {index + 1}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => copyToClipboard(q.question?.text)}
                aria-label={`Copy question ${index + 1}`}
                title="Copy question text"
                className="size-8 shrink-0 p-0"
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
      </>
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
