"use client";

import React, { ReactNode, useCallback, useState } from "react";
import { EditIcon } from "lucide-react";
import MarkdownEditor from "../ui/MarkdownEditor";
import { Button } from "../ui/button";
import { DocumentWindow } from "../ui/document-window";
import { cn } from "@/lib/utils";

type Props = {
  text?: string;
  onSave?: (text: string) => void;
  // Window title, e.g. "Edit question"
  title?: string;
  className?: string;
  children?: ReactNode;
  // Controlled (e.g. opened from a menu item, which unmounts when the menu
  // closes): no trigger is rendered unless children are given
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

// Editing markdown needs room, so it opens in the document window: full
// screen on phones, a large centred window on desktop. Closing with unsaved
// changes (X, Escape, back button) asks first instead of losing them.
const EditMarkdownSheet = ({ text, onSave, title = "Edit text", children, className, open: openProp, onOpenChange }: Props) => {
  const [innerOpen, setInnerOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : innerOpen;
  const setOpen = useCallback((o: boolean) => (controlled ? onOpenChange?.(o) : setInnerOpen(o)), [controlled, onOpenChange]);

  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const close = () => {
    setConfirmDiscard(false);
    setDirty(false);
    setOpen(false);
  };
  const requestOpenChange = (o: boolean) => {
    if (o) return setOpen(true);
    if (dirty) setConfirmDiscard(true);
    else close();
  };

  const trigger = children ? (
    <span onClick={() => setOpen(true)} className="contents">
      {children}
    </span>
  ) : (
    <Button variant="outline" className={cn("h-fit w-fit p-2", className)} onClick={() => setOpen(true)} aria-label={title}>
      <EditIcon className="size-3" />
    </Button>
  );

  return (
    <>
      {(children || !controlled) && trigger}
      <DocumentWindow
        open={open}
        onOpenChange={requestOpenChange}
        title={title}
        description={dirty ? "Unsaved changes" : undefined}
        bodyClassName="flex flex-col overflow-hidden"
        footer={
          confirmDiscard ? (
            <div className="flex flex-wrap items-center gap-2" role="alert">
              <p className="min-w-0 flex-1 text-sm font-medium">Discard your changes?</p>
              <Button variant="outline" className="h-10" onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </Button>
              <Button variant="destructive" className="h-10" onClick={close}>
                Discard
              </Button>
            </div>
          ) : undefined
        }
      >
        {open && (
          <MarkdownEditor
            defaultText={text}
            onDirtyChange={setDirty}
            onSave={(value) => {
              onSave?.(value);
              close();
            }}
          />
        )}
      </DocumentWindow>
    </>
  );
};

export default EditMarkdownSheet;
