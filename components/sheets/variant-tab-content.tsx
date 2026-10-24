"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  CopyIcon,
  Loader2Icon,
  PencilIcon,
  RotateCwIcon,
  ShapesIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  Undo2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Markdown from "@/components/ui/markdown";
import EditMarkdownSheet from "@/components/sheets/edit-markdown-sheet";
import DiagramPromptSheet from "@/components/sheets/diagram-prompt-sheet";
import { api, ENDPOINT } from "@/lib/api";
import { imageToBase64Jpeg } from "@/lib/image";
import { uploadQuestionsInBatch } from "@/service/core.service";
import { useVariantBatchStore } from "@/stores/variantBatchStore";
import {
  type TGeneratedQuestion,
  type TRecheckResponse,
  type TThinkingMode,
} from "@/lib/ai/types";

type Props = {
  tabId: string;
  // From the upload header, shared by every tab in the batch
  chapter?: string;
  marks: string;
  tags: string[];
};

const THINKING_INFO: Record<TThinkingMode, { expectedMs: number }> = {
  low: { expectedMs: 8000 },
  medium: { expectedMs: 15000 },
  high: { expectedMs: 30000 },
};

// Shown as the progress bar fills up (threshold in %, message)
const PROGRESS_MESSAGES: [number, string][] = [
  [0, "Reading your question…"],
  [12, "Gemini is thinking…"],
  [28, "Gemini is cooking up fresh values…"],
  [45, "Checking the maths…"],
  [60, "Writing detailed solutions…"],
  [75, "Almost done…"],
  [88, "Variants about to arrive, sit tight…"],
];

// Gemini gives no progress events, so the bar follows the expected time for
// the chosen thinking mode: fast at first, then slowing down near the end.
const GenerationProgress = ({ expectedMs }: { expectedMs: number }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - start), 200);
    return () => clearInterval(timer);
  }, []);

  const percent = 95 * (1 - Math.exp((-1.8 * elapsed) / expectedMs));
  const message =
    elapsed > expectedMs * 2
      ? "Taking a bit longer than usual, still working…"
      : [...PROGRESS_MESSAGES].reverse().find(([at]) => percent >= at)?.[1];

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{message}</span>
        <span className="tabular-nums text-slate-500">{Math.floor(elapsed / 1000)}s</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-linear"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

// Copies the raw markdown of the question followed by its answer
const CopyQuestionButton = ({ question }: { question: TGeneratedQuestion }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${question.text}\n\n${question.ans}`);
      setCopied(true);
      toast.success("Copied question and answer");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-9 w-9 shrink-0"
      onClick={copy}
      title="Copy question and answer"
      aria-label="Copy question and answer"
    >
      {copied ? <CheckIcon className="w-4 h-4 text-green-600" /> : <CopyIcon className="w-4 h-4" />}
    </Button>
  );
};

// Recheck state lives only in this sheet; nothing about it is saved
type TCheckState = {
  loading: boolean;
  result?: TRecheckResponse;
  previous?: TGeneratedQuestion; // the version before the recheck, for Undo
};

const showAnswer = (answer?: string) => (answer || "").replace(/\\/g, "").trim() || "none";

const CHECK_STYLES: Record<TRecheckResponse["status"], string> = {
  checked: "bg-green-50 text-green-800",
  "answer-changed": "bg-blue-50 text-blue-800",
  "question-fixed": "bg-blue-50 text-blue-800",
  manual: "bg-amber-50 text-amber-800",
};

const checkTitle = (result: TRecheckResponse) => {
  switch (result.status) {
    case "checked":
      return "Recently checked: answer confirmed";
    case "answer-changed":
      return `Recently checked: answer changed from ${showAnswer(result.previousAnswer)} to ${showAnswer(result.newAnswer)}`;
    case "question-fixed":
      return "Recently checked: question fixed";
    case "manual":
      return "Check manually";
  }
};

const CheckStrip = ({ check, onUndo }: { check?: TCheckState; onUndo: () => void }) => {
  if (!check) return null;
  if (check.loading) {
    return (
      <div className="flex items-center gap-2 border-b bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
        Gemini is solving and checking this question…
      </div>
    );
  }
  const result = check.result;
  if (!result) return null;
  const showIssues = result.status !== "checked" && result.issues.length > 0;
  return (
    <div className={`flex flex-col gap-1 border-b px-3 py-2 text-xs ${CHECK_STYLES[result.status]}`}>
      <div className="flex items-start gap-2">
        <span className="font-semibold">{checkTitle(result)}</span>
        {check.previous && (
          <button
            type="button"
            onClick={onUndo}
            className="ml-auto flex shrink-0 items-center gap-1 font-medium underline underline-offset-2"
          >
            <Undo2Icon className="w-3 h-3" /> Undo
          </button>
        )}
      </div>
      {result.summary && <p className="opacity-90">{result.summary}</p>}
      {showIssues && (
        <ul className="list-disc pl-4 opacity-90">
          {result.issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

const labelFor = (q: TGeneratedQuestion, index: number, hasOriginal: boolean) =>
  q.kind === "original" ? "Original" : `Variant ${hasOriginal ? index : index + 1}`;

// One tab's questions: generated by the store, reviewed and uploaded here.
// Nothing in this component survives switching tabs, so anything worth keeping
// lives in the store instead.
const VariantTabContent = ({ tabId, chapter, marks, tags }: Props) => {
  const tab = useVariantBatchStore((s) => s.tabs.find((t) => t.id === tabId));
  const thinking = useVariantBatchStore((s) => s.thinking);
  const model = useVariantBatchStore((s) => s.model);
  const setSelected = useVariantBatchStore((s) => s.setSelected);
  const updateInStore = useVariantBatchStore((s) => s.updateQuestion);
  const markUploaded = useVariantBatchStore((s) => s.markUploaded);
  const retry = useVariantBatchStore((s) => s.retry);
  const imageFor = useVariantBatchStore((s) => s.imageFor);

  // Transient: a recheck result describes a reply, not work worth keeping
  const [checks, setChecks] = useState<Record<string, TCheckState>>({});
  const [promptsFor, setPromptsFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!tab) return null;

  const { questions, questionType, selected, status } = tab;
  const hasOriginal = questions.some((q) => q.kind === "original");
  const selectedQuestions = questions.filter((q) => selected[q.id]);
  const rechecking = Object.values(checks).some((c) => c.loading);

  const updateQuestion = (id: string, change: Partial<TGeneratedQuestion>) =>
    updateInStore(tabId, id, change);

  const clearCheck = (id: string) =>
    setChecks((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  // A manual edit means the tag no longer describes what is on screen
  const editQuestion = (id: string, change: Partial<TGeneratedQuestion>) => {
    updateQuestion(id, change);
    clearCheck(id);
  };

  // One Gemini call: it solves the question without seeing our answer, then we
  // replace the question, answer and solution in place with what it sends back.
  const recheck = async (q: TGeneratedQuestion) => {
    const before = checks[q.id];
    setChecks((prev) => ({ ...prev, [q.id]: { ...prev[q.id], loading: true } }));
    try {
      const original = questions.find((x) => x.kind === "original");
      // The photo is only in memory, so a tab restored after a reload checks
      // the original against its text alone
      const file = q.kind === "original" ? imageFor(tabId) : undefined;
      const { data } = await api.post<TRecheckResponse>(ENDPOINT.recheckVariant, {
        text: q.text,
        answerKey: q.ans.split("\n")[0],
        questionType,
        kind: q.kind,
        originalText: q.kind === "variant" ? original?.text : undefined,
        image: file ? await imageToBase64Jpeg(file) : undefined,
        model: model || undefined,
      });
      if (data.question) {
        // A rewritten question makes the saved drawing brief describe something
        // that is no longer there, so it is dropped and the prompt falls back
        // to its generic wording.
        const reworded = data.question.text.trim() !== q.text.trim();
        updateQuestion(q.id, {
          ...data.question,
          ...(reworded ? { diagramBrief: "", solutionDiagramBrief: "" } : {}),
        });
      }
      setChecks((prev) => ({
        ...prev,
        [q.id]: { loading: false, result: data, previous: data.question ? q : undefined },
      }));
    } catch (err: any) {
      toast.error(err?.message || "Could not recheck the question");
      setChecks((prev) => ({ ...prev, [q.id]: { ...before, loading: false } }));
    }
  };

  const undoRecheck = (id: string) => {
    const previous = checks[id]?.previous;
    if (previous) updateQuestion(id, previous);
    clearCheck(id);
  };

  const upload = async () => {
    if (!chapter) {
      toast.error("Select a Class, Subject, Book and Chapter in the header first");
      return;
    }
    if (selectedQuestions.length === 0) return;
    setUploading(true);
    try {
      await uploadQuestionsInBatch(
        selectedQuestions.map((q) => ({
          text: q.text,
          ans: q.ans,
          chapter,
          mark: Number(marks),
          tags,
        }))
      );
      toast.success(
        `Uploaded ${selectedQuestions.length} question${selectedQuestions.length > 1 ? "s" : ""}`
      );
      // Saved on the server now, so the tab goes and the next one takes over
      markUploaded(tabId);
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (status === "queued" || status === "generating") {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <GenerationProgress expectedMs={THINKING_INFO[thinking].expectedMs} />
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <TriangleAlertIcon className="h-8 w-8 text-amber-500" strokeWidth={1.5} />
        <p className="text-sm text-slate-600">{tab.error || "This one could not be generated."}</p>
        {tab.hasImage ? (
          <Button variant="outline" onClick={() => retry(tabId)} className="gap-2">
            <RotateCwIcon className="h-4 w-4" /> Try again
          </Button>
        ) : (
          <p className="text-xs text-slate-500">
            The photo is no longer in memory. Add it again from the Generate panel.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {questions.length === 0 && (
          <p className="text-sm text-slate-500">No questions came back for this photo.</p>
        )}
        {        questions.map((q, index) => (
          <div
            key={q.id}
            className={`min-w-0 overflow-hidden rounded-lg border bg-white transition-colors ${
              selected[q.id] ? "border-primary ring-1 ring-primary" : "border-slate-200"
            }`}
          >
            {/* Whole header row toggles the checkbox, so it is easy to tap */}
            <label
              htmlFor={`variant-${q.id}`}
              className="flex cursor-pointer items-center gap-3 border-b bg-slate-50 px-3 py-2.5"
            >
              <Checkbox
                id={`variant-${q.id}`}
                className="h-5 w-5"
                checked={!!selected[q.id]}
                onCheckedChange={(checked) =>
                  setSelected(tabId, q.id, checked === true)
                }
              />
              <span className="text-sm font-semibold">{labelFor(q, index, hasOriginal)}</span>
              {(q.needsDiagram || q.needsSolutionDiagram) && (
                <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <TriangleAlertIcon className="w-3 h-3" />
                  {q.needsDiagram && q.needsSolutionDiagram
                    ? "Needs diagrams"
                    : q.needsSolutionDiagram
                      ? "Answer needs diagram"
                      : "Needs diagram"}
                </span>
              )}
            </label>

            <CheckStrip check={checks[q.id]} onUndo={() => undoRecheck(q.id)} />

            <div className="max-w-full overflow-x-auto break-words px-3 py-3 text-sm [&_ol]:list-decimal [&_ol]:list-outside [&_ol]:ml-4">
              <Markdown text={q.text} />
            </div>

            <details className="mx-3 mb-3 max-w-full overflow-x-auto break-words rounded-md bg-slate-50 px-3 py-2 text-sm">
              <summary className="cursor-pointer py-1 font-medium">
                Answer: {q.ans.split("\n")[0].replace(/\\/g, "")}
                <span className="ml-1 font-normal text-slate-500">· solution</span>
              </summary>
              <Markdown text={q.ans} />
            </details>

            <div className="flex items-center gap-2 border-t px-3 py-2">
              <CopyQuestionButton question={q} />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => recheck(q)}
                disabled={!!checks[q.id]?.loading}
                title="Recheck with AI"
                aria-label="Recheck with AI"
              >
                {checks[q.id]?.loading ? (
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheckIcon className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant={q.needsDiagram || q.needsSolutionDiagram ? "default" : "outline"}
                onClick={() => setPromptsFor(q.id)}
                className="h-9 flex-1 gap-1.5 px-2 text-xs sm:text-sm"
              >
                <ShapesIcon className="w-3.5 h-3.5" /> Diagram
              </Button>
              <EditMarkdownSheet text={q.text} onSave={(text) => editQuestion(q.id, { text })}>
                <Button
                  variant="outline"
                  disabled={!!checks[q.id]?.loading}
                  className="h-9 flex-1 gap-1.5 px-2 text-xs sm:text-sm"
                >
                  <PencilIcon className="w-3.5 h-3.5" /> Edit question
                </Button>
              </EditMarkdownSheet>
              <EditMarkdownSheet text={q.ans} onSave={(ans) => editQuestion(q.id, { ans })}>
                <Button
                  variant="outline"
                  disabled={!!checks[q.id]?.loading}
                  className="h-9 flex-1 gap-1.5 px-2 text-xs sm:text-sm"
                >
                  <PencilIcon className="w-3.5 h-3.5" /> Edit answer
                </Button>
              </EditMarkdownSheet>
            </div>
          </div>
        ))}
      </div>

      <DiagramPromptSheet
        open={!!promptsFor}
        onOpenChange={(next) => !next && setPromptsFor(null)}
        question={questions.find((q) => q.id === promptsFor) ?? null}
        questionType={questionType}
        label={(() => {
          const index = questions.findIndex((q) => q.id === promptsFor);
          const q = questions[index];
          return q ? labelFor(q, index, hasOriginal) : "";
        })()}
      />

      {questions.length > 0 && (
        <div className="sticky bottom-0 mt-auto border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
          <Button
            onClick={upload}
            disabled={uploading || rechecking || selectedQuestions.length === 0}
            className="h-11 w-full gap-2"
          >
            {uploading && <Loader2Icon className="w-4 h-4 animate-spin" />}
            Upload {selectedQuestions.length} selected
          </Button>
        </div>
      )}
    </>
  );
};

export default VariantTabContent;
