"use client";

import React, { useEffect, useState } from "react";
import {
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import VariantTabContent from "@/components/sheets/variant-tab-content";
import { useVariantBatchStore, type TVariantTab } from "@/stores/variantBatchStore";
import { cn } from "@/lib/utils";

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
        active ? "border-brand bg-brand-soft text-brand" : "border-border bg-card text-muted-foreground"
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

// The batch of questions being turned into variants: one tab per question,
// each with its own photo/text, settings and results. Moved out of the old
// side sheet so it can use a whole page; the flow inside a tab is unchanged.
export const VariantBatch = () => {
  const tabs = useVariantBatchStore((s) => s.tabs);
  const activeId = useVariantBatchStore((s) => s.activeId);
  const addTab = useVariantBatchStore((s) => s.addTab);
  const setPhoto = useVariantBatchStore((s) => s.setPhoto);
  const setActive = useVariantBatchStore((s) => s.setActive);
  const removeTab = useVariantBatchStore((s) => s.removeTab);

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  // Landing on an empty batch should show a form, not a blank pane. The store
  // outlives the page, so coming back keeps the tabs from before.
  useEffect(() => {
    if (useVariantBatchStore.getState().tabs.length === 0) addTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A pasted screenshot fills the open tab's photo. It does not start the
  // generation: pressing Generate stays the only thing that does. Listening on
  // the document because with no field focused the paste targets <body>.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // A paste inside the markdown editor is its own; it handles its images
      if (e.defaultPrevented) return;
      const photo = Array.from(e.clipboardData?.files ?? []).find((f) => IMAGE_TYPES.includes(f.type));
      if (!photo) return;
      e.preventDefault();
      const { tabs, activeId, addTab } = useVariantBatchStore.getState();
      const target = tabs.find((t) => t.id === activeId) ?? tabs[0];
      setPhoto(target?.id ?? addTab(), photo);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [setPhoto]);

  return (
    <div className="flex flex-col gap-3">
      {tabs.length > 0 && (
        // One scrolling row: five tabs will not fit across a phone
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 scrollbar-hide sm:mx-0 sm:px-0">
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
            className="h-9 w-9 shrink-0 rounded-full bg-card p-0"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

      {active ? (
        // Keyed so switching tabs starts the next one clean rather than
        // carrying the last tab's recheck strips across
        <VariantTabContent key={active.id} tabId={active.id} />
      ) : (
        <div className="p-6 text-center">
          <Button variant="outline" onClick={() => addTab()} className="gap-2">
            <PlusIcon className="h-4 w-4" /> Add a question
          </Button>
        </div>
      )}
    </div>
  );
};
