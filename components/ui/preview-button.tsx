"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";
import { Button, ButtonProps } from "./button";
import { Print, PrintContent, PrintTrigger } from "./print";
import PaperFrame from "../frames/paper-frame";
import type { TQuestion } from "@/models/Question";
import { Columns2Icon, ListRestartIcon, Loader2Icon } from "lucide-react";
import MCQAnsFrame from "../frames/mcq-ans-frame";
import TeachersCopiesFrame from "../frames/teachers-copies-frame";
import CopyQuestionsMd from "./copy--questions-md";
import PresntFrame from "../frames/present-frame";
import PaperPreview from "./paper-preview";
import usePaper from "@/hooks/usePaper";
import { cn } from "@/lib/utils";

type Props = {
  questions: TQuestion[];
  onPrint?: () => void;
  defaultTwoColumn?: boolean;
  className?: string;
  onQuestionRemove?: (question: TQuestion) => void;
  editable?: boolean;
  variant?: ButtonProps["variant"];
  // For a paper from a list, where the questions arrive with marks only. The
  // full paper is fetched the first time the sheet is opened, so browsing a
  // page of papers does not download every question in all of them.
  paperId?: string;
};

const PreviewButton = ({
  questions,
  onPrint,
  defaultTwoColumn,
  className,
  onQuestionRemove,
  editable,
  variant = "outline",
  paperId,
}: Props) => {
  const [twoColumn, setTwoColumn] = useState(defaultTwoColumn);
  const [loadPreview, setLoadPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // Only requested once the sheet has been opened
  const { paper, loading: paperLoading } = usePaper({
    id: paperId && open ? paperId : null,
  });
  const fullQuestions = paperId ? paper?.questions ?? [] : questions;
  const waitingForPaper = Boolean(paperId) && paperLoading && fullQuestions.length === 0;

  useEffect(() => {
    if (defaultTwoColumn != twoColumn) {
      setTwoColumn(defaultTwoColumn);
    }
  }, [defaultTwoColumn]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          disabled={questions.length === 0}
          variant={variant}
          className={className}
        >
          Preview
        </Button>
      </SheetTrigger>
      <SheetContent
        side={"bottom"}
        className="m-auto flex h-[100svh] max-w-screen-lg flex-col gap-0 rounded px-2 pt-10 sm:h-[90svh]"
      >
        {/* A paper opened from a list is still on its way, and printing an
            empty one would be worse than waiting for it */}
        {waitingForPaper && (
          <div className="flex min-h-0 flex-1 items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2Icon className="h-4 w-4 animate-spin" />
            Loading paper…
          </div>
        )}

        {/* One scrolling row on a phone: these buttons used to wrap into three
            rows and eat the height the preview needed. */}
        <div
          className={cn(
            "z-10 -mx-2 flex shrink-0 gap-2 overflow-x-auto bg-white px-2 pb-2 scrollbar-hide [&>*]:shrink-0 sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-0",
            waitingForPaper && "hidden"
          )}
        >
          <Print>
            <PrintTrigger
              className="px-6"
              onClick={() => {
                startTransition(() => {
                  onPrint?.();
                });
              }}
              disabled={questions.length === 0}
            >
              Print
            </PrintTrigger>
            <PrintContent>
              <PaperFrame questions={fullQuestions} twoColumn={twoColumn} />
            </PrintContent>
          </Print>
          <Print>
            <PrintTrigger>Print MCQ Answer</PrintTrigger>
            <PrintContent>
              <MCQAnsFrame questions={fullQuestions} />
            </PrintContent>
          </Print>
          <Print>
            <PrintTrigger>Print Teachers Copy</PrintTrigger>
            <PrintContent>
              <TeachersCopiesFrame
                questions={fullQuestions}
                twoColumn={twoColumn}
              />
            </PrintContent>
          </Print>
          <Print>
            <PrintTrigger>Present</PrintTrigger>
            <PrintContent>
              <PresntFrame questions={fullQuestions} />
            </PrintContent>
          </Print>
          <CopyQuestionsMd questions={fullQuestions} />

          <Button
            variant={twoColumn ? "default" : "outline"}
            onClick={() => {
              setTwoColumn(!twoColumn);
            }}
            className="sm:ml-auto sm:mr-4"
            aria-label="Two column layout"
          >
            <Columns2Icon className="w-4 h-4" />
          </Button>
        </div>
        {/* The preview is the only thing that scrolls, so the toolbar stays put */}
        <div className={cn("min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide", waitingForPaper && "hidden")}>
        {loadPreview ? (
          <PaperPreview>
            <PaperFrame
              questions={fullQuestions}
              twoColumn={twoColumn}
              editable={editable}
              onQuestionRemove={onQuestionRemove}
            />
          </PaperPreview>
        ) : (
          <Button
            disabled={isPending}
            variant={"outline"}
            className="my-6 flex h-[320px] w-full items-center justify-center rounded-xl border border-dashed border-slate-400 bg-slate-50 text-base sm:h-[600px]"
            onClick={() => {
              startTransition(() => {
                setLoadPreview(true);
              });
            }}
          >
            {isPending ? (
              <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <ListRestartIcon className="w-5 h-5 mr-2" />
            )}
            Load Preview
          </Button>
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PreviewButton;
