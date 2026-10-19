"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  CopyIcon,
  ImageIcon,
  Loader2Icon,
  PencilIcon,
  SparklesIcon,
  TriangleAlertIcon,
  ShieldCheckIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import SelectCompact from "@/components/ui/select-compact";
import Markdown from "@/components/ui/markdown";
import EditMarkdownSheet from "@/components/sheets/edit-markdown-sheet";
import { api, ENDPOINT } from "@/lib/api";
import { imageToBase64Jpeg } from "@/lib/image";
import { uploadQuestionsInBatch } from "@/service/core.service";
import {
  DEFAULT_THINKING_MODE,
  THINKING_MODES,
  type TGeneratedQuestion,
  type TGenerateVariantsResponse,
  type TQuestionType,
  type TRecheckResponse,
  type TThinkingMode,
} from "@/lib/ai/types";

type Props = {
  // From the upload header
  chapter?: string;
  marks: string;
  tags: string[];
};

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const THINKING_INFO: Record<TThinkingMode, { label: string; expectedMs: number }> = {
  low: { label: "Fast", expectedMs: 8000 },
  medium: { label: "Balanced", expectedMs: 15000 },
  high: { label: "Deep (slowest)", expectedMs: 30000 },
};

const THINKING_STORAGE_KEY = "generate-variants-thinking";

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

const GenerateVariantsSheet = ({ chapter, marks, tags }: Props) => {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState<TThinkingMode>(DEFAULT_THINKING_MODE);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [questions, setQuestions] = useState<TGeneratedQuestion[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [questionType, setQuestionType] = useState<TQuestionType>("MCQ");
  const [checks, setChecks] = useState<Record<string, TCheckState>>({});

  useEffect(() => {
    if (!image) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(image);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  // Remember the last thinking mode on this browser
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THINKING_STORAGE_KEY) as TThinkingMode | null;
      if (saved && THINKING_MODES.includes(saved)) setThinking(saved);
    } catch {}
  }, []);

  const changeThinking = (value: string) => {
    if (!THINKING_MODES.includes(value as TThinkingMode)) return;
    setThinking(value as TThinkingMode);
    try {
      localStorage.setItem(THINKING_STORAGE_KEY, value);
    } catch {}
  };

  const pickImage = (files: FileList | File[] | null | undefined) => {
    const file = Array.from(files || []).find((f) => IMAGE_TYPES.includes(f.type));
    if (file) setImage(file);
    return !!file;
  };

  const reset = () => {
    setImage(null);
    setPrompt("");
    setQuestions([]);
    setSelected({});
    setChecks({});
  };

  const generate = async () => {
    if (!image) {
      toast.error("Add an image of the question first");
      return;
    }
    setGenerating(true);
    try {
      const payload = await imageToBase64Jpeg(image);
      const { data } = await api.post<TGenerateVariantsResponse>(ENDPOINT.generateVariants, {
        image: payload,
        prompt: prompt.trim() || undefined,
        thinking,
      });
      setQuestions(data.questions);
      setQuestionType(data.questionType);
      setChecks({});
      // Variants start ticked; the original starts unticked
      setSelected(Object.fromEntries(data.questions.map((q) => [q.id, q.kind === "variant"])));
    } catch (err: any) {
      toast.error(err?.message || "Could not generate variants");
    } finally {
      setGenerating(false);
    }
  };

  const updateQuestion = (id: string, change: Partial<TGeneratedQuestion>) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...change } : q)));

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
      const { data } = await api.post<TRecheckResponse>(ENDPOINT.recheckVariant, {
        text: q.text,
        answerKey: q.ans.split("\n")[0],
        questionType,
        kind: q.kind,
        originalText: q.kind === "variant" ? original?.text : undefined,
        // The original is checked against the photo it was transcribed from
        image: q.kind === "original" && image ? await imageToBase64Jpeg(image) : undefined,
      });
      if (data.question) updateQuestion(q.id, data.question);
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

  const rechecking = Object.values(checks).some((c) => c.loading);

  const selectedQuestions = questions.filter((q) => selected[q.id]);

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
      toast.success(`Uploaded ${selectedQuestions.length} question${selectedQuestions.length > 1 ? "s" : ""}`);
      reset();
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const hasOriginal = questions.some((q) => q.kind === "original");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <SparklesIcon className="w-4 h-4 shrink-0" />
          Generate
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full max-w-full sm:max-w-none md:max-w-none md:w-1/2 p-0 gap-0 overflow-y-auto overflow-x-hidden flex flex-col [&>*]:shrink-0"
        onPaste={(e) => {
          // Pastes inside a nested editor bubble up here; the editor handles its own images
          if (e.defaultPrevented) return;
          if (pickImage(e.clipboardData?.files)) e.preventDefault();
        }}
      >
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <SheetHeader className="pr-8 text-left sm:text-left space-y-1">
            <SheetTitle className="text-base sm:text-lg">Generate question variants</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">
              Add a photo or screenshot of a question. Gemini writes the original and 2 variants
              with answers. Uploads use the chapter, marks and tag from the header.
            </SheetDescription>
          </SheetHeader>

          <label
            className="relative flex min-h-[112px] sm:min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-3 sm:p-4 text-center text-sm text-slate-500 hover:bg-slate-50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickImage(e.dataTransfer.files);
            }}
          >
            {imagePreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Question"
                  className="max-h-[180px] sm:max-h-[260px] max-w-full object-contain"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8"
                  aria-label="Remove image"
                  onClick={(e) => {
                    e.preventDefault();
                    setImage(null);
                  }}
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <ImageIcon className="w-7 h-7" strokeWidth={1.5} />
                <p>Tap to add the question image</p>
                <p className="hidden sm:block text-xs">You can also paste or drop it here</p>
              </>
            )}
            <input
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                pickImage(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {/* text-base on phones stops iOS zooming into the field */}
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Optional: extra instructions, e.g. make it harder, use SI units…"
            className="min-h-[64px] text-base sm:text-sm"
          />

          <div className="flex items-end gap-2 sm:justify-end sm:gap-3">
            <SelectCompact
              label="Thinking"
              className="w-[40%] sm:w-[180px] shrink-0"
              value={thinking}
              onChange={changeThinking}
              disabled={generating}
              options={THINKING_MODES.map((mode) => ({
                label: THINKING_INFO[mode].label,
                value: mode,
              }))}
            />
            <Button onClick={generate} disabled={!image || generating} className="gap-2 flex-1 sm:w-[160px] sm:flex-none">
              {generating ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : (
                <SparklesIcon className="w-4 h-4" />
              )}
              {generating ? "Generating…" : questions.length ? "Regenerate" : "Generate"}
            </Button>
          </div>

          {generating && <GenerationProgress expectedMs={THINKING_INFO[thinking].expectedMs} />}

          {!generating &&
            questions.map((q, index) => (
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
                      setSelected((prev) => ({ ...prev, [q.id]: checked === true }))
                    }
                  />
                  <span className="text-sm font-semibold">{labelFor(q, index, hasOriginal)}</span>
                  {q.needsDiagram && (
                    <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      <TriangleAlertIcon className="w-3 h-3" />
                      Needs diagram
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

        {!generating && questions.length > 0 && (
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
      </SheetContent>
    </Sheet>
  );
};

export default GenerateVariantsSheet;
