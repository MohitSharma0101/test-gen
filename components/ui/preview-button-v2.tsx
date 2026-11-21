"use client";

import React, { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  ClipboardCopyIcon,
  Columns2Icon,
  EllipsisIcon,
  EyeIcon,
  FileTextIcon,
  ListChecksIcon,
  Loader2Icon,
  PresentationIcon,
  PrinterIcon,
  RectangleVerticalIcon,
  UserCheckIcon,
} from "lucide-react";
import { DocumentWindow } from "./document-window";
import { Button, ButtonProps, buttonVariants } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Print, PrintContent, PrintTrigger, usePrint } from "./print";
import PaperFrame from "../frames/paper-frame";
import MCQAnsFrame from "../frames/mcq-ans-frame";
import TeachersCopiesFrame from "../frames/teachers-copies-frame";
import PresntFrame from "../frames/present-frame";
import { answersMd, copyText, questionsAndAnswersMd, questionsMd } from "./copy--questions-md";
import PaperPreview from "./paper-preview";
import { Skeleton } from "./skeleton";
import usePaper from "@/hooks/usePaper";
import type { TQuestion } from "@/models/Question";
import { cn, getTotalMarks } from "@/lib/utils";

// Revamped preview (v2). Same props and behaviour as PreviewButton; v1 stays
// for pages that haven't been revamped yet. What gets printed is unchanged:
// the same frames, only the window around them is new.
//
// Opens in DocumentWindow: full screen on phones, a large centred window on
// wider screens, header shrinking as the paper scrolls.
type Props = {
  questions: TQuestion[];
  onPrint?: () => void;
  defaultTwoColumn?: boolean;
  className?: string;
  onQuestionRemove?: (question: TQuestion) => void;
  editable?: boolean;
  variant?: ButtonProps["variant"];
  // For a paper from a list, where the questions arrive with marks only. The
  // full paper is fetched the first time the preview is opened.
  paperId?: string;
};

type PrintJobKey = "answers" | "teacher" | "present";

// A print-out that lives outside the More menu (menu items unmount when the
// menu closes, which would take the content with them before it printed) and
// hands its print function up so a menu item can call it.
const PrintJob = ({ onReady, children }: { onReady: (print: () => void) => void; children: ReactNode }) => (
  <Print>
    <PrintJobBridge onReady={onReady} />
    <PrintContent>{children}</PrintContent>
  </Print>
);
const PrintJobBridge = ({ onReady }: { onReady: (print: () => void) => void }) => {
  const { handlePrint } = usePrint();
  useEffect(() => {
    if (handlePrint) onReady(() => handlePrint());
  });
  return null;
};

const LayoutToggle = ({ twoColumn, onChange }: { twoColumn: boolean; onChange: (two: boolean) => void }) => (
  <div role="group" aria-label="Paper layout" className="flex shrink-0 rounded-lg border bg-muted p-0.5">
    {[
      { two: false, label: "1 column", Icon: RectangleVerticalIcon },
      { two: true, label: "2 columns", Icon: Columns2Icon },
    ].map(({ two, label, Icon }) => (
      <button
        key={label}
        type="button"
        aria-pressed={twoColumn === two}
        aria-label={label}
        title={label}
        onClick={() => onChange(two)}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          twoColumn === two && "bg-card text-foreground shadow-sm"
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
        <span className="hidden md:inline">{label}</span>
      </button>
    ))}
  </div>
);

const PreviewButtonV2 = ({
  questions,
  onPrint,
  defaultTwoColumn,
  className,
  onQuestionRemove,
  editable,
  variant = "outline",
  paperId,
}: Props) => {
  const [twoColumn, setTwoColumn] = useState(Boolean(defaultTwoColumn));
  const [loadPreview, setLoadPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const jobs = useRef<Partial<Record<PrintJobKey, () => void>>>({});

  // Only requested once the preview has been opened
  const { paper, loading: paperLoading } = usePaper({ id: paperId && open ? paperId : null });
  const fullQuestions = paperId ? paper?.questions ?? [] : questions;
  const waitingForPaper = Boolean(paperId) && paperLoading && fullQuestions.length === 0;

  useEffect(() => {
    setTwoColumn(Boolean(defaultTwoColumn));
  }, [defaultTwoColumn]);

  const count = fullQuestions.length || questions.length;
  const summary = `${count} question${count === 1 ? "" : "s"} · ${getTotalMarks(fullQuestions.length ? fullQuestions : questions)} marks`;

  // Toolbar: the main action, everything else in one menu, and the  layout. Fits a phone on one line without scrolling.
  const toolbar = (
      <div className={cn("flex items-center gap-2", waitingForPaper && "pointer-events-none opacity-50")}>
        <Print>
          <PrintTrigger
            className={cn(buttonVariants({ variant: "brand" }), "h-10 gap-2 px-5")}
            onClick={() => startTransition(() => onPrint?.())}
            disabled={count === 0 || waitingForPaper}
          >
            <PrinterIcon className="size-4" aria-hidden="true" />
            Print
          </PrintTrigger>
          <PrintContent>
            <PaperFrame questions={fullQuestions} twoColumn={twoColumn} />
          </PrintContent>
        </Print>

        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline" }), "h-10 gap-2")}>
            <EllipsisIcon className="size-4" aria-hidden="true" />
            More
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60 rounded-xl p-1.5">
            <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Print</DropdownMenuLabel>
            <DropdownMenuItem className="h-10 cursor-pointer gap-2.5 rounded-lg" onSelect={() => jobs.current.answers?.()}>
              <ListChecksIcon className="size-4" aria-hidden="true" /> Answer key
            </DropdownMenuItem>
            <DropdownMenuItem className="h-10 cursor-pointer gap-2.5 rounded-lg" onSelect={() => jobs.current.teacher?.()}>
              <UserCheckIcon className="size-4" aria-hidden="true" /> Teacher&apos;s copy
            </DropdownMenuItem>
            <DropdownMenuItem className="h-10 cursor-pointer gap-2.5 rounded-lg" onSelect={() => jobs.current.present?.()}>
              <PresentationIcon className="size-4" aria-hidden="true" /> Present
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Copy as Markdown</DropdownMenuLabel>
            <DropdownMenuItem className="h-10 cursor-pointer gap-2.5 rounded-lg" onSelect={() => copyText(questionsMd(fullQuestions))}>
              <ClipboardCopyIcon className="size-4" aria-hidden="true" /> Questions
            </DropdownMenuItem>
            <DropdownMenuItem className="h-10 cursor-pointer gap-2.5 rounded-lg" onSelect={() => copyText(answersMd(fullQuestions))}>
              <ClipboardCopyIcon className="size-4" aria-hidden="true" /> Answers
            </DropdownMenuItem>
            <DropdownMenuItem
              className="h-10 cursor-pointer gap-2.5 rounded-lg"
              onSelect={() => copyText(questionsAndAnswersMd(fullQuestions))}
            >
              <ClipboardCopyIcon className="size-4" aria-hidden="true" /> Questions & answers
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto">
          <LayoutToggle twoColumn={twoColumn} onChange={setTwoColumn} />
        </div>

        {/* The other print-outs, kept mounted for the menu items above */}
        <PrintJob onReady={(p) => (jobs.current.answers = p)}>
          <MCQAnsFrame questions={fullQuestions} />
        </PrintJob>
        <PrintJob onReady={(p) => (jobs.current.teacher = p)}>
          <TeachersCopiesFrame questions={fullQuestions} twoColumn={twoColumn} />
        </PrintJob>
        <PrintJob onReady={(p) => (jobs.current.present = p)}>
          <PresntFrame questions={fullQuestions} />
        </PrintJob>
      </div>
  );

  const body = (
    <>
        {waitingForPaper ? (
          <div className="mx-auto max-w-3xl space-y-3 p-4" aria-busy="true" aria-label="Loading paper">
            <Skeleton className="h-8 w-1/2" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : loadPreview ? (
          <div className="p-2 sm:p-4">
            {/* A4 width, centred */}
            <PaperPreview className="mx-auto max-w-[820px]">
              <PaperFrame questions={fullQuestions} twoColumn={twoColumn} editable={editable} onQuestionRemove={onQuestionRemove} />
            </PaperPreview>
          </div>
        ) : (
          // Rendering every question's maths is slow, so it waits to be asked
          // for; printing doesn't need it
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-card text-muted-foreground shadow-sm">
              <FileTextIcon className="size-7" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div>
              <p className="font-medium">See the paper before printing</p>
              <p className="text-sm text-muted-foreground">You can print without loading the preview.</p>
            </div>
            <Button
              variant="outline"
              disabled={isPending || count === 0}
              className="h-10 gap-2 bg-card"
              onClick={() => startTransition(() => setLoadPreview(true))}
            >
              {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <EyeIcon className="size-4" />}
              Show preview
            </Button>
          </div>
        )}
    </>
  );

  return (
    <>
      <Button disabled={!paperId && questions.length === 0} variant={variant} className={className} onClick={() => setOpen(true)}>
        Preview
      </Button>
      <DocumentWindow
        open={open}
        onOpenChange={setOpen}
        title="Preview"
        description={waitingForPaper ? "Loading paper…" : summary}
        toolbar={toolbar}
        bodyClassName="bg-muted/40 scrollbar-hide"
      >
        {body}
      </DocumentWindow>
    </>
  );
};

export default PreviewButtonV2;
