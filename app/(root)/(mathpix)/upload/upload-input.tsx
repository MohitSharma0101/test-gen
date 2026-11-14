"use client";

import React, { ReactNode, useRef, useState } from "react";
import { CheckCircle2Icon, PenLineIcon, UploadIcon } from "lucide-react";
import EditMarkdownSheet from "@/components/sheets/edit-markdown-sheet";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { cn, readFile } from "@/lib/utils";

type Props = {
  icon: ReactNode;
  label: string;
  hint: string;
  text: string;
  // How many numbered items were read from it
  count: number;
  // This file is what the preview is built from right now
  active: boolean;
  onChange: (text: string) => void;
};

// One Mathpix .md source: choose or drop a file, or type/paste it in the editor
const UploadInput = ({ icon, label, hint, text, count, active, onChange }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const read = (file?: File) => {
    if (!file) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) {
      toast({ title: "Pick the .md file Mathpix exported", variant: "destructive" });
      return;
    }
    readFile(file, onChange);
  };

  return (
    <div
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        read(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors",
        active && text && "border-emerald-300 bg-emerald-50/40",
        dragging && "border-brand bg-brand-soft ring-2 ring-brand"
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg [&>svg]:size-5",
          text ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
        )}
        aria-hidden="true"
      >
        {text ? <CheckCircle2Icon /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{label}</span>
        <span className={cn("block truncate text-xs", text ? "font-medium text-emerald-700" : "text-muted-foreground")}>
          {text ? `${count} item${count === 1 ? "" : "s"} read` : hint}
        </span>
      </span>
      <input
        ref={input}
        type="file"
        accept=".md,.markdown,.txt"
        className="hidden"
        onChange={(e) => {
          read(e.target.files?.[0]);
          // The same file can be chosen again after an edit
          e.target.value = "";
        }}
      />
      <Button variant="outline" className="h-10 gap-1.5 px-3" onClick={() => input.current?.click()}>
        <UploadIcon className="size-4" />
        <span className="hidden sm:inline">{text ? "Replace" : "Choose"}</span>
        <span className="sr-only sm:hidden">Choose {label} file</span>
      </Button>
      <EditMarkdownSheet text={text} onSave={onChange}>
        <Button variant="ghost" className="size-10 shrink-0 p-0" aria-label={`Type or edit ${label}`}>
          <PenLineIcon className="size-4" />
        </Button>
      </EditMarkdownSheet>
    </div>
  );
};

export default UploadInput;
