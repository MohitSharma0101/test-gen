"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  ImagePlusIcon,
  PencilIcon,
  SparklesIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { buildDiagramPrompt, diagramPromptTitle, type TDiagramKind } from "@/lib/ai/diagramPrompt";
import type { TGeneratedQuestion, TQuestionType } from "@/lib/ai/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: TGeneratedQuestion | null;
  questionType: TQuestionType;
  label: string;
};

const STEPS = [
  { icon: CopyIcon, text: "Copy the prompt" },
  { icon: SparklesIcon, text: "Paste it into ChatGPT, Gemini or any image model" },
  { icon: ImagePlusIcon, text: "Save the image it draws" },
  { icon: PencilIcon, text: "Edit question or Edit answer, then drop the image in" },
];

// One prompt, with its own copy button and a peek at the text
const PromptCard = ({
  kind,
  prompt,
  needed,
}: {
  kind: TDiagramKind;
  prompt: string;
  needed: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success(`${diagramPromptTitle(kind)} prompt copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked outside https on some phones: show it to copy by hand
      setShow(true);
      toast.error("Could not copy automatically. Select the text below.");
    }
  };

  return (
    <div
      className={`min-w-0 rounded-xl border bg-white transition-colors ${
        needed ? "border-amber-300 bg-amber-50/40" : "border-slate-200"
      }`}
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        <span className="truncate text-sm font-semibold">{diagramPromptTitle(kind)}</span>
        {needed && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            Needed
          </span>
        )}
      </div>
      <p className="px-3 pt-1 text-xs text-slate-500">
        {kind === "question"
          ? "Shows the setup, without giving the answer away."
          : "Shows the working: free-body arrows, ray paths, construction lines."}
      </p>

      <div className="flex items-center gap-2 p-3">
        {/* Big tap target: this is the one thing to press on a phone */}
        <Button onClick={copy} className="h-11 flex-1 gap-2 text-sm">
          {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          {copied ? "Copied" : "Copy prompt"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShow((s) => !s)}
          aria-expanded={show}
          aria-label={show ? "Hide the prompt" : "Show the prompt"}
          className="h-11 w-11 shrink-0 p-0"
        >
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${show ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {show && (
        <pre className="mx-3 mb-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700 select-all">
          {prompt}
        </pre>
      )}
    </div>
  );
};

const DiagramPromptSheet = ({ open, onOpenChange, question, questionType, label }: Props) => {
  const prompts = useMemo(() => {
    if (!question) return [];
    // Both are always offered: the flags are the model's guess, and a teacher may
    // want a figure it did not ask for.
    return (["question", "solution"] as TDiagramKind[]).map((kind) => ({
      kind,
      prompt: buildDiagramPrompt(question, kind, questionType),
      needed: kind === "question" ? question.needsDiagram : question.needsSolutionDiagram,
    }));
  }, [question, questionType]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] overflow-y-auto rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="text-base">Diagram prompts</SheetTitle>
          <SheetDescription className="text-xs">
            {label} &middot; draw it in any image model, then paste the picture in.
          </SheetDescription>
        </SheetHeader>

        <ol className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3">
          {STEPS.map(({ icon: Icon, text }, i) => (
            <li key={text} className="flex items-start gap-2.5 text-xs text-slate-600">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
                {i + 1}
              </span>
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="min-w-0">{text}</span>
            </li>
          ))}
        </ol>

        <div className="mt-3 space-y-3">
          {prompts.map(({ kind, prompt, needed }) => (
            <PromptCard key={kind} kind={kind} prompt={prompt} needed={needed} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DiagramPromptSheet;
