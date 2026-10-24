"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  ImageIcon,
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  TriangleAlertIcon,
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
import { Textarea } from "@/components/ui/textarea";
import SelectCompact from "@/components/ui/select-compact";
import ImageSourceSheet from "@/components/sheets/image-source-sheet";
import VariantTabContent from "@/components/sheets/variant-tab-content";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import { useVariantBatchStore, type TVariantTab } from "@/stores/variantBatchStore";
import { DEFAULT_FREE_MODEL, FREE_MODELS, isFreeModel } from "@/lib/ai/free-models";
import { THINKING_MODES, type TThinkingMode } from "@/lib/ai/types";
import { DEFAULT_VARIANT_COUNT, VARIANT_COUNTS } from "@/lib/ai/generateVariants";
import { cn } from "@/lib/utils";

type Props = {
  // From the upload header
  chapter?: string;
  marks: string;
  tags: string[];
};

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const THINKING_LABELS: Record<TThinkingMode, string> = {
  low: "Fast",
  medium: "Balanced",
  high: "Deep (slowest)",
};

const THINKING_STORAGE_KEY = "generate-variants-thinking";
const MODEL_STORAGE_KEY = "generate-variants-model";

// A tab says where it is at a glance: the photo is still queued, being read,
// ready to review, or it failed.
const TabChip = ({
  tab,
  active,
  onSelect,
  onRemove,
}: {
  tab: TVariantTab;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) => {
  const ready = tab.status === "ready";
  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-white text-slate-600"
      )}
    >
      <button type="button" onClick={onSelect} className="flex items-center gap-1.5">
        {tab.status === "generating" && <Loader2Icon className="h-3 w-3 animate-spin" />}
        {tab.status === "queued" && <span className="h-2 w-2 rounded-full bg-slate-300" />}
        {ready && <CheckIcon className="h-3 w-3 text-green-600" />}
        {tab.status === "failed" && <TriangleAlertIcon className="h-3 w-3 text-amber-500" />}
        <span>{tab.label}</span>
        {ready && tab.questions.length > 0 && (
          <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-600">
            {tab.questions.length}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${tab.label}`}
        className="opacity-50 hover:opacity-100"
      >
        <XIcon className="h-3 w-3" />
      </button>
    </div>
  );
};

const GenerateVariantsSheet = ({ chapter, marks, tags }: Props) => {
  const [open, setOpen] = useState(false);
  // Phones and tablets: ask "camera or gallery" before opening a picker
  const isTouch = useIsTouchDevice();
  const [sourceOpen, setSourceOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const tabs = useVariantBatchStore((s) => s.tabs);
  const activeId = useVariantBatchStore((s) => s.activeId);
  const model = useVariantBatchStore((s) => s.model);
  const thinking = useVariantBatchStore((s) => s.thinking);
  const prompt = useVariantBatchStore((s) => s.prompt);
  const variantCount = useVariantBatchStore((s) => s.variantCount);
  const addPhotos = useVariantBatchStore((s) => s.addPhotos);
  const setActive = useVariantBatchStore((s) => s.setActive);
  const removeTab = useVariantBatchStore((s) => s.removeTab);
  const setModel = useVariantBatchStore((s) => s.setModel);
  const setThinking = useVariantBatchStore((s) => s.setThinking);
  const setPrompt = useVariantBatchStore((s) => s.setPrompt);
  const setVariantCount = useVariantBatchStore((s) => s.setVariantCount);

  // Remember the last thinking mode and model on this browser
  useEffect(() => {
    try {
      const savedThinking = localStorage.getItem(THINKING_STORAGE_KEY) as TThinkingMode | null;
      if (savedThinking && THINKING_MODES.includes(savedThinking)) setThinking(savedThinking);
      const savedModel = localStorage.getItem(MODEL_STORAGE_KEY) || "";
      if (isFreeModel(savedModel)) setModel(savedModel);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeModel = (value: string) => {
    if (!value) return;
    setModel(value);
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, value);
    } catch {}
  };

  const changeThinking = (value: string) => {
    if (!THINKING_MODES.includes(value as TThinkingMode)) return;
    setThinking(value as TThinkingMode);
    try {
      localStorage.setItem(THINKING_STORAGE_KEY, value);
    } catch {}
  };

  // Every photo picked becomes its own tab and starts generating straight away
  const pickImages = (files: FileList | File[] | null | undefined) => {
    const picked = Array.from(files || []).filter((f) => IMAGE_TYPES.includes(f.type));
    if (picked.length) {
      addPhotos(picked);
      setAdding(false);
    }
    return picked.length > 0;
  };

  // Gemma models have no thinking setting
  const thinkingApplies = !model.startsWith("gemma-");
  const showPicker = adding || tabs.length === 0;
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

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
        className="flex w-full max-w-full flex-col gap-0 overflow-x-hidden p-0 sm:max-w-none md:w-1/2 md:max-w-none"
        onPaste={(e) => {
          // Pastes inside a nested editor bubble up here; the editor handles its own images
          if (e.defaultPrevented) return;
          if (pickImages(e.clipboardData?.files)) e.preventDefault();
        }}
      >
        <div className="flex shrink-0 flex-col gap-3 border-b p-4 sm:p-6">
          <SheetHeader className="space-y-1 pr-8 text-left sm:text-left">
            <SheetTitle className="text-base sm:text-lg">Generate question variants</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">
              Each one gets its own tab and starts generating
            </SheetDescription>
          </SheetHeader>

          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={(e) => {
              pickImages(e.target.files);
              e.target.value = "";
            }}
          />

          {showPicker && (
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={() => (isTouch ? setSourceOpen(true) : fileInput.current?.click())}
                className="h-24 flex-col gap-2 border-dashed text-sm"
              >
                <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
                Add question photos
              </Button>

              {/* text-base on phones stops iOS zooming into the field */}
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Optional: extra instructions for every photo, e.g. make it harder, use SI units…"
                className="min-h-[64px] text-base sm:text-sm"
              />

              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end sm:gap-3">
                <SelectCompact
                  label="Model"
                  className="min-w-0 sm:w-[220px]"
                  triggerClassName="text-left"
                  value={model}
                  onChange={changeModel}
                  options={FREE_MODELS.map((m) => ({
                    label: m.id === DEFAULT_FREE_MODEL ? `${m.label} (default)` : m.label,
                    value: m.id,
                  }))}
                />
                <SelectCompact
                  label="Thinking"
                  className="min-w-0 sm:w-[160px]"
                  value={thinking}
                  onChange={changeThinking}
                  disabled={!thinkingApplies}
                  options={THINKING_MODES.map((mode) => ({
                    label: THINKING_LABELS[mode],
                    value: mode,
                  }))}
                />
                <SelectCompact
                  label="Variants"
                  className="min-w-0 sm:w-[120px]"
                  value={String(variantCount)}
                  onChange={(value) => setVariantCount(Number(value))}
                  options={VARIANT_COUNTS.map((count) => ({
                    label: count === DEFAULT_VARIANT_COUNT ? `${count} (default)` : String(count),
                    value: String(count),
                  }))}
                />
                {tabs.length > 0 && (
                  <Button variant="ghost" onClick={() => setAdding(false)} className="col-span-2">
                    Done
                  </Button>
                )}
              </div>
            </div>
          )}

          {tabs.length > 0 && (
            // One scrolling row: five tabs will not fit across a phone
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide sm:-mx-6 sm:px-6">
              {tabs.map((tab) => (
                <TabChip
                  key={tab.id}
                  tab={tab}
                  active={tab.id === active?.id}
                  onSelect={() => setActive(tab.id)}
                  onRemove={() => removeTab(tab.id)}
                />
              ))}
              {!showPicker && (
                <Button
                  variant="outline"
                  onClick={() => setAdding(true)}
                  aria-label="Add another photo"
                  className="h-9 w-9 shrink-0 rounded-full p-0"
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {active ? (
            // Keyed so switching tabs starts the next one clean rather than
            // carrying the last tab's recheck strips across
            <VariantTabContent
              key={active.id}
              tabId={active.id}
              chapter={chapter}
              marks={marks}
              tags={tags}
            />
          ) : (
            !showPicker && (
              <p className="p-6 text-center text-sm text-slate-500">
                Add a photo to get started.
              </p>
            )
          )}
        </div>

        <ImageSourceSheet
          open={sourceOpen}
          onOpenChange={setSourceOpen}
          title="Add a question photo"
          onChooseFile={() => fileInput.current?.click()}
          onPhoto={(file) => {
            if (!pickImages([file])) {
              toast.error("That photo format isn't supported. Try Choose image instead.");
            }
          }}
        />
      </SheetContent>
    </Sheet>
  );
};

export default GenerateVariantsSheet;
