"use client";

import React, { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "../ui/button";
import LabelInput from "../ui/label-input";
import { ResponsiveDrawer } from "../ui/responsive-drawer";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Panel title, e.g. "Edit chapter"
  heading: string;
  label: string;
  defaultTitle: string;
  // Shown (and saved) only when given: a chapter's position in its book
  defaultOrder?: number;
  // Resolves true when saved; the panel closes only then
  onSave: (title: string, order?: number) => Promise<boolean>;
};

// Rename a book or chapter (and set a chapter's position)
const EditTitleSheet = ({ open, onOpenChange, heading, label, defaultTitle, defaultOrder, onSave }: Props) => {
  const withOrder = defaultOrder !== undefined;
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [order, setOrder] = useState(withOrder ? String(defaultOrder ?? "") : "");
  const [saving, setSaving] = useState(false);

  const orderNumber = Number(order);
  const changed = title.trim() !== (defaultTitle ?? "").trim() || (withOrder && orderNumber !== defaultOrder);
  // The API ignores order 0, so positions start at 1
  const canSave = Boolean(title.trim()) && (!withOrder || orderNumber >= 1) && changed && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (await onSave(title.trim(), withOrder ? orderNumber : undefined)) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={heading}
      description={defaultTitle}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="brand" className="h-11 flex-1 gap-2" onClick={save} disabled={!canSave}>
            {saving && <Loader2Icon className="size-4 animate-spin" />}
            Save
          </Button>
        </div>
      }
    >
      <form
        className="space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <LabelInput
          label={label}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
          inputClassName="h-11 text-base sm:text-sm"
        />
        {withOrder && (
          <LabelInput
            label="Position in book"
            inputMode="numeric"
            value={order}
            onChange={(e) => setOrder(e.target.value.replace(/\D/g, ""))}
            inputClassName="h-11 w-28 text-base tabular-nums sm:text-sm"
          />
        )}
        {withOrder && <p className="ml-1 text-xs text-muted-foreground">Chapters are listed by this number, lowest first.</p>}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </ResponsiveDrawer>
  );
};

export default EditTitleSheet;
