"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";
import { Button } from "./button";
import { Print, PrintContent, PrintTrigger } from "./print";
import PaperFrame from "../frames/paper-frame";
import type { TQuestion } from "@/models/Question";
import { Columns2Icon, ListRestartIcon, Loader2Icon } from "lucide-react";
import MCQAnsFrame from "../frames/mcq-ans-frame";
import TeachersCopiesFrame from "../frames/teachers-copies-frame";
import CopyQuestionsMd from "./copy--questions-md";

type Props = {
  questions: TQuestion[];
  onPrint?: () => void;
  defaultTwoColumn?: boolean;
  className?: string;
  onQuestionRemove?: (question: TQuestion) => void;
  editable?: boolean;
};

const PreviewButton = ({
  questions,
  onPrint,
  defaultTwoColumn,
  className,
  onQuestionRemove,
  editable,
}: Props) => {
  const [twoColumn, setTwoColumn] = useState(defaultTwoColumn);
  const [loadPreview, setLoadPreview] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (defaultTwoColumn != twoColumn) {
      setTwoColumn(defaultTwoColumn);
    }
  }, [defaultTwoColumn]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          disabled={questions.length === 0}
          variant={"outline"}
          className={className}
        >
          Preview
        </Button>
      </SheetTrigger>
      <SheetContent
        side={"bottom"}
        className="max-h-[90svh] m-auto rounded max-w-screen-lg scrollbar-hide overflow-scroll"
      >
        <div className="flex gap-2 bg-white w-full mr-5 z-10">
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
              <PaperFrame questions={questions} twoColumn={twoColumn} />
            </PrintContent>
          </Print>
          <Print>
            <PrintTrigger>Print MCQ Answer</PrintTrigger>
            <PrintContent>
              <MCQAnsFrame questions={questions} />
            </PrintContent>
          </Print>
          <Print>
            <PrintTrigger>Print Teachers Copy</PrintTrigger>
            <PrintContent>
              <TeachersCopiesFrame
                questions={questions}
                twoColumn={twoColumn}
              />
            </PrintContent>
          </Print>
          <CopyQuestionsMd questions={questions} />

          <Button
            variant={twoColumn ? "default" : "outline"}
            onClick={() => {
              setTwoColumn(!twoColumn);
            }}
            className="ml-auto mr-4"
          >
            <Columns2Icon className="w-4 h-4" />
          </Button>
        </div>
        {loadPreview ? (
          <PaperFrame
            questions={questions}
            twoColumn={twoColumn}
            editable={editable}
            onQuestionRemove={onQuestionRemove}
          />
        ) : (
          <Button
            disabled={isPending}
            variant={"outline"}
            className=" w-full flex items-center justify-center h-[600px] text-base border border-dashed border-slate-400 bg-slate-50 rounded-xl my-6"
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
      </SheetContent>
    </Sheet>
  );
};

export default PreviewButton;
