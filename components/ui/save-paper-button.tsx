"use client";

import React, { useState } from "react";
import { CloudUploadIcon, Loader2Icon } from "lucide-react";
import { Button } from "./button";
import LabelInput from "./label-input";
import SelectCompact from "./select-compact";
import { ResponsiveDrawer } from "./responsive-drawer";
import type { TQuestion } from "@/models/Question";
import { savePaper } from "@/service/core.service";
import { PaperStatus, PaperStatusOptions } from "@/data/const";
import { useAuthors } from "@/hooks/useAuthors";
import { cn, getTotalMarks } from "@/lib/utils";

type Props = {
  id?: string;
  defaultTitle?: string;
  defaultAuthor?: string;
  questions: TQuestion[];
  // Called after a successful save (e.g. to clear a local draft)
  onSaved?: () => void;
  className?: string;
};

// Save (or update) a paper: title, author, status. A drawer like every other
// task panel: bottom sheet on phones, floating right panel on desktop.
const SavePaperButton = ({ questions, defaultTitle = "", defaultAuthor, id, onSaved, className }: Props) => {
  const [title, setTitle] = useState(defaultTitle);
  const { authors, author, updateAuthor } = useAuthors({ defaultAuthor });
  const [status, setStatus] = useState(PaperStatus.PUBLIC);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const count = questions.length;
  const canSave = count > 0 && Boolean(title.trim()) && !saving;

  const onSubmit = async () => {
    if (!title.trim()) {
      setError("Give the paper a title.");
      return;
    }
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      // Closes only once it saved; the title is kept so a retry is one tap
      if (await savePaper(title.trim(), questions, id, author, status)) {
        setOpen(false);
        onSaved?.();
      }
    } catch (err) {
      console.warn(err);
      setError("Couldn't save the paper. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button disabled={count === 0} variant="outline" className={cn("gap-2", className)} onClick={() => setOpen(true)}>
        <CloudUploadIcon className="size-4" />
        Save
      </Button>
      <ResponsiveDrawer
        open={open}
        onOpenChange={setOpen}
        title={id ? "Update paper" : "Save paper"}
        description={`${count} question${count === 1 ? "" : "s"} · ${getTotalMarks(questions)} marks`}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="h-11" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="brand" className="h-11 flex-1 gap-2" onClick={onSubmit} disabled={!canSave}>
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : <CloudUploadIcon className="size-4" />}
              {id ? "Save changes" : "Save paper"}
            </Button>
          </div>
        }
      >
        <form
          className="space-y-4 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <LabelInput
            label="Title"
            placeholder="e.g. Physics Unit Test 3"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError("");
            }}
            autoComplete="off"
            inputClassName="h-11 text-base sm:text-sm"
          />
          <SelectCompact
            label="Author"
            options={authors.map((a) => ({ label: a, value: a }))}
            placeholder="Select author"
            value={author}
            onChange={updateAuthor}
          />
          <fieldset>
            <legend className="mb-1.5 ml-1 text-xs font-medium">Status</legend>
            <div role="radiogroup" aria-label="Status" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PaperStatusOptions.map((o) => {
                const active = status === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStatus(o.value)}
                    className={cn(
                      "h-10 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                      active ? "border-brand bg-brand-soft text-brand" : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </ResponsiveDrawer>
    </>
  );
};

export default SavePaperButton;
