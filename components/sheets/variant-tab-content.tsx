"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  PencilIcon,
  RotateCwIcon,
  ShapesIcon,
  ShieldCheckIcon,
  SplitIcon,
  SparklesIcon,
  TriangleAlertIcon,
  Undo2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Markdown from "@/components/ui/markdown";
import ImageSourceSheet from "@/components/sheets/image-source-sheet";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import SelectCompact from "@/components/ui/select-compact";
import { Textarea } from "@/components/ui/textarea";
import EditMarkdownSheet from "@/components/sheets/edit-markdown-sheet";
import DiagramPromptSheet from "@/components/sheets/diagram-prompt-sheet";
import { api, ENDPOINT } from "@/lib/api";
import { imageToBase64Jpeg } from "@/lib/image";
import { uploadQuestionsInBatch } from "@/service/core.service";
import {
  useVariantBatchStore,
  type TTabSettings,
  type TVariantTab,
} from "@/stores/variantBatchStore";
import { DEFAULT_FREE_MODEL, FREE_MODELS } from "@/lib/ai/free-models";
import { DEFAULT_VARIANT_COUNT, VARIANT_COUNTS } from "@/lib/ai/generateVariants";
import {
  THINKING_MODES,
  type TGeneratedQuestion,
  type TRecheckResponse,
  type TThinkingMode,
} from "@/lib/ai/types";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const THINKING_LABELS: Record<TThinkingMode, string> = {
  low: "Fast",
  medium: "Balanced",
  high: "Deep (slowest)",
};

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
// startedAt comes from the store, not from when this mounted: generation keeps
// running while the teacher is on another tab, so coming back has to show how
// far along it actually is rather than starting the bar again from zero.
const GenerationProgress = ({
  expectedMs,
  startedAt,
}: {
  expectedMs: number;
  startedAt: number;
}) => {
  const [elapsed, setElapsed] = useState(() => Date.now() - startedAt);

  useEffect(() => {
    setElapsed(Date.now() - startedAt);
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 200);
    return () => clearInterval(timer);
  }, [startedAt]);

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
const CopyQuestionButton = ({
  question,
  className,
}: {
  question: TGeneratedQuestion;
  className?: string;
}) => {
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
      className={className ?? "h-9 w-9 shrink-0"}
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

// The photo this tab came from, with the settings it was generated with. It
// collapses once there are questions to review, because on a phone the review
// is what the teacher came for - but it is still there to change and run again.
const TabInputs = ({
  tab,
  busy,
  onChange,
  onGenerate,
}: {
  tab: TVariantTab;
  busy: boolean;
  onChange: (change: Partial<TTabSettings>) => void;
  onGenerate: () => void;
}) => {
  const setPhoto = useVariantBatchStore((s) => s.setPhoto);
  const setSourceText = useVariantBatchStore((s) => s.setSourceText);
  const setSource = useVariantBatchStore((s) => s.setSource);
  const file = useVariantBatchStore((s) => s.imageFor)(tab.id);
  const fromText = tab.source === "text";
  const [preview, setPreview] = useState("");
  const [open, setOpen] = useState(tab.questions.length === 0);
  const [sourceOpen, setSourceOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const isTouch = useIsTouchDevice();

  const pick = (files: FileList | File[] | null | undefined) => {
    const picked = Array.from(files || []).find((f) => IMAGE_TYPES.includes(f.type));
    if (picked) setPhoto(tab.id, picked);
    return !!picked;
  };
  const choose = () => (isTouch ? setSourceOpen(true) : fileInput.current?.click());

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const thinkingApplies = !tab.model.startsWith("gemma-");

  return (
    <div className="rounded-lg border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-2 text-left"
      >
        {fromText ? (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-slate-100">
            <FileTextIcon className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
          </span>
        ) : preview ? (
          <img src={preview} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-slate-100">
            <ImageIcon className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{tab.label}</span>
          <span className="block truncate text-xs text-slate-500">
            {(fromText ? tab.sourceText.trim() : preview)
              ? `${fromText ? "Text" : "Photo"} · ${tab.variantCount} variant${tab.variantCount > 1 ? "s" : ""} · ${tab.model.replace(/^gemini-|^gemma-/, "")}`
              : fromText
                ? "Add the question text to begin"
                : "Add a photo to begin"}
          </span>
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t p-3">
          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              pick(e.target.files);
              e.target.value = "";
            }}
          />
          {/* A tab holds both a photo and a question's text; this is which
              one it generates from. A photo is what most questions start as,
              so that is where a new tab sits. */}
          <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
            {(["image", "text"] as const).map((option) => (
              <button
                key={option}
                type="button"
                disabled={busy}
                onClick={() => setSource(tab.id, option)}
                className={`flex h-8 items-center justify-center gap-1.5 rounded text-xs font-medium transition-colors disabled:opacity-60 ${
                  (option === "text") === fromText
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                {option === "image" ? (
                  <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                ) : (
                  <FileTextIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
                {option === "image" ? "Photo" : "Text"}
              </button>
            ))}
          </div>

          {fromText ? (
            // The question is already written out, so there is nothing to
            // read from a photo: the text itself is what is generated from,
            // and it is editable in case the teacher wants to tweak it first.
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-600">
                Question text (Mathpix Markdown)
              </span>
              <Textarea
                value={tab.sourceText}
                onChange={(e) => setSourceText(tab.id, e.target.value)}
                disabled={busy}
                placeholder="Paste or type the question, maths in $...$"
                className="min-h-[120px] font-mono text-base sm:text-sm"
              />
            </label>
          ) : preview ? (
            <button type="button" onClick={choose} className="w-full" disabled={busy}>
              <img
                src={preview}
                alt="Question photo, tap to replace"
                className="max-h-48 w-full rounded object-contain"
              />
            </button>
          ) : (
            <Button
              variant="outline"
              onClick={choose}
              disabled={busy}
              className="h-24 flex-col gap-2 border-dashed text-sm"
            >
              <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
              Add question photo
            </Button>
          )}

          {/* text-base on phones stops iOS zooming into the field */}
          <Textarea
            value={tab.prompt}
            onChange={(e) => onChange({ prompt: e.target.value })}
            disabled={busy}
            placeholder="Optional: extra instructions, e.g. make it harder, use SI units…"
            className="min-h-[56px] text-base sm:text-sm"
          />

          <div className="grid grid-cols-2 gap-2">
            <SelectCompact
              label="Model"
              className="min-w-0"
              triggerClassName="text-left"
              value={tab.model}
              disabled={busy}
              onChange={(value) => value && onChange({ model: value })}
              options={FREE_MODELS.map((m) => ({
                label: m.id === DEFAULT_FREE_MODEL ? `${m.label} (default)` : m.label,
                value: m.id,
              }))}
            />
            <SelectCompact
              label="Thinking"
              className="min-w-0"
              value={tab.thinking}
              disabled={busy || !thinkingApplies}
              onChange={(value) => onChange({ thinking: value as TThinkingMode })}
              options={THINKING_MODES.map((mode) => ({
                label: THINKING_LABELS[mode],
                value: mode,
              }))}
            />
            <SelectCompact
              label="Variants"
              className="min-w-0"
              value={String(tab.variantCount)}
              disabled={busy}
              onChange={(value) => onChange({ variantCount: Number(value) })}
              options={VARIANT_COUNTS.map((count) => ({
                label: String(count),
                value: String(count),
              }))}
            />
            <Button
              onClick={onGenerate}
              disabled={busy || (fromText ? !tab.sourceText.trim() : !tab.hasImage)}
              className="mt-auto h-9 gap-1.5 text-xs sm:text-sm"
            >
              {busy ? (
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
              ) : tab.questions.length ? (
                <RotateCwIcon className="h-3.5 w-3.5" />
              ) : (
                <SparklesIcon className="h-3.5 w-3.5" />
              )}
              {tab.questions.length ? "Regenerate" : "Generate"}
            </Button>
          </div>
        </div>
      )}

      <ImageSourceSheet
        open={sourceOpen}
        onOpenChange={setSourceOpen}
        title="Add the question photo"
        onChooseFile={() => fileInput.current?.click()}
        onPhoto={(photo) => {
          if (!pick([photo])) {
            toast.error("That photo format isn't supported. Try Choose image instead.");
          }
        }}
      />
    </div>
  );
};

// One tab's questions: generated by the store, reviewed and uploaded here.
// Nothing in this component survives switching tabs, so anything worth keeping
// lives in the store instead.
const VariantTabContent = ({ tabId, chapter, marks, tags }: Props) => {
  const tab = useVariantBatchStore((s) => s.tabs.find((t) => t.id === tabId));
  const setSelected = useVariantBatchStore((s) => s.setSelected);
  const updateSettings = useVariantBatchStore((s) => s.updateSettings);
  const generate = useVariantBatchStore((s) => s.generate);
  const updateInStore = useVariantBatchStore((s) => s.updateQuestion);
  const markUploaded = useVariantBatchStore((s) => s.markUploaded);
  const retry = useVariantBatchStore((s) => s.retry);
  const addTextTab = useVariantBatchStore((s) => s.addTextTab);
  const imageFor = useVariantBatchStore((s) => s.imageFor);

  // Transient: a recheck result describes a reply, not work worth keeping
  const [checks, setChecks] = useState<Record<string, TCheckState>>({});
  const [promptsFor, setPromptsFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!tab) return null;

  const { questions, questionType, selected, status, model, thinking } = tab;
  const busy = status === "queued" || status === "generating";
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

  const onGenerate = () => generate(tabId);

  // Sends one generated question into a tab of its own. Nothing generates yet:
  // the point of the new tab is to add a prompt and pick a model for this one
  // question, then generate from its text - there is no photo behind it.
  const moveToTab = (q: TGeneratedQuestion, label: string) => {
    addTextTab({
      text: q.text,
      answer: q.ans,
      questionType,
      label: `${tab.label}·${label.replace("Variant ", "V").replace("Original", "O")}`,
    });
    toast.success(`${label} moved to its own tab - add a prompt and generate`);
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

  return (
    <>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* The photo and the settings that produced this tab stay with it, so
            coming back shows what was asked for and lets it be asked again */}
        <TabInputs
          tab={tab}
          busy={busy}
          onChange={(change) => updateSettings(tabId, change)}
          onGenerate={onGenerate}
        />

        {busy && (
          <GenerationProgress
            expectedMs={THINKING_INFO[thinking].expectedMs}
            startedAt={tab.startedAt ?? Date.now()}
          />
        )}

        {status === "failed" && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-center">
            <TriangleAlertIcon className="h-6 w-6 text-amber-500" strokeWidth={1.5} />
            <p className="text-sm text-amber-800">
              {tab.error || "This one could not be generated."}
            </p>
            {tab.hasImage || (tab.source === "text" && tab.sourceText.trim()) ? (
              <Button variant="outline" onClick={() => retry(tabId)} className="gap-2">
                <RotateCwIcon className="h-4 w-4" /> Try again
              </Button>
            ) : (
              <p className="text-xs text-amber-700">Add the photo again to generate this one.</p>
            )}
          </div>
        )}

        {status === "ready" && questions.length === 0 && (
          <p className="text-sm text-slate-500">No questions came back for this photo.</p>
        )}
        {        questions.map((q, index) => (
          <div
            key={q.id}
            className={`min-w-0 overflow-hidden rounded-lg border bg-white transition-colors ${
              selected[q.id] ? "border-primary ring-1 ring-primary" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 border-b bg-slate-50 px-3 py-2">
              {/* The name side of the row toggles the checkbox, so it is easy
                  to tap; the icons opposite it are their own buttons */}
              <label
                htmlFor={`variant-${q.id}`}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
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
                  <span className="flex min-w-0 items-center gap-1 truncate rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <TriangleAlertIcon className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {q.needsDiagram && q.needsSolutionDiagram
                        ? "Needs diagrams"
                        : q.needsSolutionDiagram
                          ? "Answer needs diagram"
                          : "Needs diagram"}
                    </span>
                  </span>
                )}
              </label>

              <div className="flex shrink-0 items-center gap-1">
                <CopyQuestionButton question={q} className="h-8 w-8 shrink-0" />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
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
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => moveToTab(q, labelFor(q, index, hasOriginal))}
                  title="Generate variants of this in a new tab"
                  aria-label="Generate variants of this in a new tab"
                >
                  <SplitIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

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
                  <PencilIcon className="w-3.5 h-3.5" /> Edit Ques.
                </Button>
              </EditMarkdownSheet>
              <EditMarkdownSheet text={q.ans} onSave={(ans) => editQuestion(q.id, { ans })}>
                <Button
                  variant="outline"
                  disabled={!!checks[q.id]?.loading}
                  className="h-9 flex-1 gap-1.5 px-2 text-xs sm:text-sm"
                >
                  <PencilIcon className="w-3.5 h-3.5" /> Edit Ans
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

      {status === "ready" && questions.length > 0 && (
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
