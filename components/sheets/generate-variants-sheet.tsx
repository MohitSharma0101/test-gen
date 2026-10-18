"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImageIcon, Loader2Icon, PencilIcon, SparklesIcon, TriangleAlertIcon, XIcon } from "lucide-react";
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
  low: { label: "Fast (less thinking)", expectedMs: 8000 },
  medium: { label: "Balanced", expectedMs: 15000 },
  high: { label: "Deep (most accurate, slowest)", expectedMs: 30000 },
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
          <SparklesIcon className="w-4 h-4" />
          Generate
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-none md:w-1/2 overflow-y-auto flex flex-col gap-4 [&>*]:shrink-0"
        onPaste={(e) => {
          // Pastes inside a nested editor bubble up here; the editor handles its own images
          if (e.defaultPrevented) return;
          if (pickImage(e.clipboardData?.files)) e.preventDefault();
        }}
      >
        <SheetHeader>
          <SheetTitle>Generate question variants</SheetTitle>
          <SheetDescription>
            Add a photo or screenshot of a question. Gemini writes the original and 2 variants
            with answers and solutions. Uploads go to the chapter, marks and tag set in the header.
          </SheetDescription>
        </SheetHeader>

        <label
          className="relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500 hover:bg-slate-50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickImage(e.dataTransfer.files);
          }}
        >
          {imagePreview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Question" className="max-h-[260px] max-w-full object-contain" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute right-2 top-2 h-7 w-7"
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
              <ImageIcon className="w-8 h-8" strokeWidth={1.5} />
              <p>Click to choose, drop, or paste the question image</p>
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

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Optional extra instructions, e.g. make the variants harder, use SI units, change the scenario…"
          className="min-h-[70px]"
        />

        <div className="flex items-end gap-3">
          <SelectCompact
            label="Thinking"
            className="w-[260px]"
            value={thinking}
            onChange={changeThinking}
            disabled={generating}
            options={THINKING_MODES.map((mode) => ({
              label: THINKING_INFO[mode].label,
              value: mode,
            }))}
          />
          <Button onClick={generate} disabled={!image || generating} className="gap-2 flex-grow">
            <SparklesIcon className="w-4 h-4" />
            {generating ? "Generating…" : questions.length ? "Regenerate" : "Generate"}
          </Button>
        </div>

        {generating && <GenerationProgress expectedMs={THINKING_INFO[thinking].expectedMs} />}

        {!generating && questions.length > 0 && (
          <div className="flex flex-col gap-3">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className={`rounded-md border p-3 ${selected[q.id] ? "border-primary" : "border-slate-200"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    id={`variant-${q.id}`}
                    checked={!!selected[q.id]}
                    onCheckedChange={(checked) =>
                      setSelected((prev) => ({ ...prev, [q.id]: checked === true }))
                    }
                  />
                  <label htmlFor={`variant-${q.id}`} className="font-semibold text-sm cursor-pointer">
                    {labelFor(q, index, hasOriginal)}
                  </label>
                  {q.needsDiagram && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <TriangleAlertIcon className="w-3 h-3" />
                      Needs a diagram: add one with Edit
                    </span>
                  )}
                  <EditMarkdownSheet text={q.text} onSave={(text) => updateQuestion(q.id, { text })}>
                    <Button variant="outline" size="sm" className="ml-auto h-7 gap-1">
                      <PencilIcon className="w-3 h-3" /> Question
                    </Button>
                  </EditMarkdownSheet>
                  <EditMarkdownSheet text={q.ans} onSave={(ans) => updateQuestion(q.id, { ans })}>
                    <Button variant="outline" size="sm" className="h-7 gap-1">
                      <PencilIcon className="w-3 h-3" /> Answer
                    </Button>
                  </EditMarkdownSheet>
                </div>
                <div className="[&_ol]:list-decimal [&_ol]:list-outside [&_ol]:ml-4">
                  <Markdown text={q.text} />
                </div>
                <details className="mt-2 rounded bg-slate-50 p-2 text-sm">
                  <summary className="cursor-pointer font-medium">
                    Answer: {q.ans.split("\n")[0].replace(/\\/g, "")}
                  </summary>
                  <Markdown text={q.ans} />
                </details>
              </div>
            ))}

            <Button
              onClick={upload}
              disabled={uploading || selectedQuestions.length === 0}
              className="gap-2 sticky bottom-0"
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
