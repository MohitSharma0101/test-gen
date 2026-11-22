"use client";

import type { ReactNode } from "react";
import { XIcon } from "lucide-react";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { useIsNarrowViewport } from "@/hooks/useIsNarrowViewport";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  // Shown under the title, outside the scrolling area (e.g. a toolbar)
  headerExtra?: ReactNode;
  // Pinned to the bottom, outside the scrolling area (primary action)
  footer?: ReactNode;
  // Width on tablet/desktop
  size?: "md" | "lg";
  children: ReactNode;
};

// One drawer for every task panel: slides up from the bottom on phones (swipe
// down to close) and floats in from the right on wider screens. Header and
// footer stay put; only the body scrolls.
export const ResponsiveDrawer = ({
  open,
  onOpenChange,
  title,
  description,
  headerExtra,
  footer,
  size = "md",
  children,
}: Props) => {
  const narrow = useIsNarrowViewport();
  return (
    // repositionInputs off: vaul resizes the drawer to the visual viewport when
    // the keyboard opens, and on the first focus it got the height wrong (the
    // header vanished and the form was cut off until the field was tapped
    // again). The browser already scrolls the focused field into view inside
    // the drawer's scrolling body.
    <Drawer open={open} onOpenChange={onOpenChange} direction={narrow ? "bottom" : "right"} repositionInputs={false}>
      <DrawerContent
        className={cn(
          "outline-none",
          "data-[vaul-drawer-direction=bottom]:max-h-[92dvh]",
          "data-[vaul-drawer-direction=right]:!bottom-2 data-[vaul-drawer-direction=right]:!right-2 data-[vaul-drawer-direction=right]:!top-2 data-[vaul-drawer-direction=right]:!h-auto data-[vaul-drawer-direction=right]:!w-[calc(100vw-1rem)] data-[vaul-drawer-direction=right]:overflow-hidden data-[vaul-drawer-direction=right]:!rounded-2xl data-[vaul-drawer-direction=right]:border data-[vaul-drawer-direction=right]:shadow-2xl",
          size === "md"
            ? "data-[vaul-drawer-direction=right]:!max-w-md"
            : "data-[vaul-drawer-direction=right]:!max-w-2xl"
        )}
      >
        <div className="flex shrink-0 items-start gap-2 border-b px-4 pb-3 pt-3 sm:pt-4">
          <div className="min-w-0 flex-1">
            <DrawerTitle className="text-lg font-bold leading-tight">{title}</DrawerTitle>
            {description ? (
              <DrawerDescription className="mt-1">{description}</DrawerDescription>
            ) : (
              <DrawerDescription className="sr-only">{title}</DrawerDescription>
            )}
          </div>
          <DrawerClose
            aria-label="Close"
            className="-mr-1 -mt-1 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <XIcon className="size-5" aria-hidden="true" />
          </DrawerClose>
        </div>
        {headerExtra && <div className="shrink-0 border-b px-4 py-2">{headerExtra}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="shrink-0 border-t bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">{footer}</div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
