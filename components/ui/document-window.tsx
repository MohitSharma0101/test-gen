"use client";

import { useEffect, useState, type ReactNode, type UIEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Skeleton } from "./skeleton";
import { Sheet, SheetContent } from "./sheet";
import { Dialog, DialogContent } from "./dialog";
import { useIsNarrowViewport } from "@/hooks/useIsNarrowViewport";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  // Always visible (actions); it is all that's left once the header folds
  toolbar?: ReactNode;
  // Pinned to the bottom (e.g. a save bar)
  footer?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
};

// Matches the sheet's 300ms slide (the desktop zoom is 200ms) plus a frame
export const OPEN_ANIMATION_MS = 320;

// Folds once scrolled past this, unfolds only back near the top: the gap
// stops it flickering when the header's own height change moves the content
const FOLD_AT = 48;
const UNFOLD_AT = 4;

// For reading a document — a paper, its preview — rather than doing a side
// task: full screen on phones, a large centred window on wider screens (side
// drawers are too narrow for an A4 page). Scrolling folds the title away so
// only the toolbar remains and the document gets the height.
export const DocumentWindow = ({ open, onOpenChange, title, description, toolbar, footer, bodyClassName, children }: Props) => {
  const narrow = useIsNarrowViewport();
  const [folded, setFolded] = useState(false);

  // The body is drawn only once the open animation is over. Papers are heavy
  // to render (maths, tables), and doing it during the slide/zoom made the
  // animation stall for a few hundred ms on phones. A cheap placeholder
  // slides in instead, then the real content replaces it.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!open) {
      setSettled(false);
      setFolded(false);
      return;
    }
    const t = setTimeout(() => setSettled(true), OPEN_ANIMATION_MS);
    return () => clearTimeout(t);
  }, [open]);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    // Not worth folding for content that barely scrolls: the extra height
    // would make it stop scrolling and unfold again
    if (el.scrollHeight - el.clientHeight < FOLD_AT * 3) return;
    const top = el.scrollTop;
    setFolded((was) => (was ? top > UNFOLD_AT : top > FOLD_AT));
  };

  const content = (
    <>
      <div className="shrink-0 border-b">
        {/* Title block collapses to zero height (grid-rows 1fr → 0fr animates
            smoothly) and fades; the title stays in the DOM for screen readers */}
        <div
          className={cn(
            "grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-200 motion-safe:ease-out",
            folded ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="px-4 pb-2 pr-14 pt-4">
              <DialogPrimitive.Title className="truncate text-lg font-bold">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className={cn("text-sm tabular-nums text-muted-foreground", !description && "sr-only")}>
                {description || title}
              </DialogPrimitive.Description>
            </div>
          </div>
        </div>
        {toolbar && (
          // Clears the close button once the title row above it is gone
          <div
            className={cn(
              "px-4 pb-2.5 motion-safe:transition-[padding] motion-safe:duration-200",
              folded ? "pr-14 pt-2.5" : "pt-1"
            )}
          >
            {toolbar}
          </div>
        )}
      </div>
      <div onScroll={onScroll} className={cn("min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain", bodyClassName)}>
        {settled ? (
          children
        ) : (
          <div className="mx-auto max-w-3xl space-y-3 p-4" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        )}
      </div>
      {footer && (
        <div className="shrink-0 border-t bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">{footer}</div>
      )}
    </>
  );

  return narrow ? (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* The sheet's default 500ms slide feels sluggish for a full screen */}
      <SheetContent side="bottom" className="flex h-[100dvh] flex-col gap-0 p-0 data-[state=open]:duration-300 data-[state=closed]:duration-200">
        {content}
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92dvh] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">{content}</DialogContent>
    </Dialog>
  );
};
