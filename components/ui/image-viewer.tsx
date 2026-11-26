"use client";

import { useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  images: { url: string }[];
  /** The image on screen; null keeps the viewer closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
};

/**
 * Full-screen look at a message's images. They used to open in a new browser
 * tab, which in the installed app means leaving it. Swipe, the arrows or the
 * arrow keys move between a message's images; the X, a tap on the backdrop
 * and Escape close it. Same component as the student app's.
 */
export default function ImageViewer({ images, index, onIndexChange }: Props) {
  const open = index !== null && !!images[index];
  const startX = useRef<number | null>(null);
  const count = images.length;
  const go = (step: number) => {
    if (index === null || count < 2) return;
    onIndexChange((index + step + count) % count);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onIndexChange(null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/90 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
          onPointerDown={(e) => (startX.current = e.clientX)}
          onPointerUp={(e) => {
            if (startX.current === null) return;
            const dx = e.clientX - startX.current;
            startX.current = null;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          }}
          onClick={(e) => {
            // A tap on the dark area around the image closes it.
            if (e.target === e.currentTarget) onIndexChange(null);
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none"
        >
          <DialogPrimitive.Title className="sr-only">Image</DialogPrimitive.Title>
          {open && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={images[index].url}
              src={images[index].url}
              alt={count > 1 ? `Image ${index + 1} of ${count}` : "Image"}
              draggable={false}
              className="max-h-[85dvh] max-w-full select-none rounded-lg object-contain"
            />
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
              {count > 1 && index !== null ? `${index + 1} / ${count}` : ""}
            </span>
            <DialogPrimitive.Close
              aria-label="Close image"
              className="pointer-events-auto flex size-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <XIcon className="size-5" />
            </DialogPrimitive.Close>
          </div>

          {count > 1 &&
            [
              { step: -1, Icon: ChevronLeftIcon, label: "Previous image", side: "left-2" },
              { step: 1, Icon: ChevronRightIcon, label: "Next image", side: "right-2" },
            ].map(({ step, Icon, label, side }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                onClick={() => go(step)}
                className={cn(
                  "absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25",
                  side
                )}
              >
                <Icon className="size-6" />
              </button>
            ))}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
