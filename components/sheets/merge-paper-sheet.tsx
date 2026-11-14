"use client";

import { useState } from "react";
import { Loader2Icon, MergeIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import LabelInput from "../ui/label-input";
import SelectCompact from "../ui/select-compact";
import { ResponsiveDrawer } from "../ui/responsive-drawer";
import { PaperStatus, PaperStatusOptions } from "@/data/const";
import { api, ENDPOINT } from "@/lib/api";
import { useAuthors } from "@/hooks/useAuthors";
import { cn } from "@/lib/utils";

type Props = {
  paperIds: string[];
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClear?: () => void;
  onRefresh?: () => void;
};

// Merge the selected papers into one new paper: title, author, status.
// Same form as Save paper.
export const MergePaperSheet = ({ paperIds, open, onOpenChange, onClear, onRefresh }: Props) => {
  const [title, setTitle] = useState("");
  const { authors, author, updateAuthor } = useAuthors();
  const [status, setStatus] = useState(PaperStatus.PUBLIC);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const count = paperIds.length;
  const canMerge = Boolean(title.trim()) && Boolean(author) && count >= 2 && !saving;

  const onSubmit = async () => {
    if (!canMerge) return;
    setSaving(true);
    setError("");
    try {
      await api.put(ENDPOINT.mergePapers, { paperIds, title: title.trim(), author, status });
      toast.success(`Merged into "${title.trim()}"`);
      onClear?.();
      onRefresh?.();
    } catch (err) {
      // A readable message instead of the raw error object
      setError((err as Error)?.message || "Couldn't merge the papers. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={(o) => onOpenChange?.(o)}
      title="Merge papers"
      description={`${count} paper${count === 1 ? "" : "s"} into one new paper; the originals stay`}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="h-11" onClick={onClear}>
            Clear selection
          </Button>
          <Button variant="brand" className="h-11 flex-1 gap-2" onClick={onSubmit} disabled={!canMerge}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : <MergeIcon className="size-4" />}
            Merge {count}
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
        {count < 2 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Select at least two papers to merge.</p>}
        <LabelInput
          label="New paper title"
          placeholder="e.g. Half-yearly revision"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError("");
          }}
          autoComplete="off"
          inputClassName="h-11 text-base sm:text-sm"
        />
        <SelectCompact label="Author" options={authors.map((a) => ({ label: a, value: a }))} placeholder="Select author" value={author} onChange={updateAuthor} />
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
  );
};
