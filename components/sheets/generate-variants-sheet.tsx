"use client";

import React, { useEffect, useState } from "react";
import {
  CheckIcon,
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
import VariantTabContent from "@/components/sheets/variant-tab-content";
import { useVariantBatchStore, type TVariantTab } from "@/stores/variantBatchStore";
import { cn } from "@/lib/utils";

type Props = {
  // From the upload header
  chapter?: string;
  marks: string;
  tags: string[];
};

// A tab says where it is at a glance: the photo is still queued, being read,
// ready to review, or it failed.
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

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

  const tabs = useVariantBatchStore((s) => s.tabs);
  const activeId = useVariantBatchStore((s) => s.activeId);
  const addTab = useVariantBatchStore((s) => s.addTab);
  const setPhoto = useVariantBatchStore((s) => s.setPhoto);
  const setActive = useVariantBatchStore((s) => s.setActive);
  const removeTab = useVariantBatchStore((s) => s.removeTab);

  // The tab owns its photo and settings, so adding one only makes the tab -
  // the teacher picks the photo inside it and presses Generate when ready
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  // Opening the sheet on an empty batch should land on a form, not a blank pane
  useEffect(() => {
    if (open && tabs.length === 0) addTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A pasted screenshot fills the open tab's photo. It does not start the
  // generation: pressing Generate stays the only thing that does.
  const pasteImage = (e: React.ClipboardEvent) => {
    // A paste inside the markdown editor is its own; it handles its images
    if (e.defaultPrevented) return;
    const photo = Array.from(e.clipboardData?.files ?? []).find((f) =>
      IMAGE_TYPES.includes(f.type)
    );
    if (!photo) return;
    e.preventDefault();
    setPhoto(active?.id ?? addTab(), photo);
  };

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
        onPaste={pasteImage}
      >
        <div className="flex shrink-0 flex-col gap-3 border-b p-4 sm:p-6">
          <SheetHeader className="space-y-1 pr-8 text-left sm:text-left">
            <SheetTitle className="text-base sm:text-lg">Generate question variants</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">
              Each question gets its own tab
            </SheetDescription>
          </SheetHeader>

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
              <Button
                variant="outline"
                onClick={() => addTab()}
                aria-label="Add another question"
                className="h-9 w-9 shrink-0 rounded-full p-0"
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
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
            <div className="p-6 text-center">
              <Button variant="outline" onClick={() => addTab()} className="gap-2">
                <PlusIcon className="h-4 w-4" /> Add a question
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GenerateVariantsSheet;
