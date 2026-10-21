"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { MaximizeIcon, MinimizeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// A4 at 96dpi. The preview has to lay the paper out at its real width whatever
// the screen is: it is what gets printed, and reflowing it to 375px would show
// a page nobody is going to produce. Two-column mode and the MathJax sizing
// (globals.css forces "#preview svg" to the width of its container) both follow
// the container, so a narrow container means a preview that lies.
export const PAPER_WIDTH = 794;

type Props = {
  children: React.ReactNode;
  className?: string;
};

// Lays the paper out at PAPER_WIDTH and scales it down to fit, the way a PDF
// viewer does, so a phone shows the whole page instead of a reflowed one.
const PaperPreview = ({ children, className }: Props) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [actualSize, setActualSize] = useState(false);
  const [paperHeight, setPaperHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const paper = paperRef.current;
    if (!outer || !paper) return;

    // Reading scrollHeight forces a synchronous layout of the whole paper, and
    // the paper resizes once per equation as MathJax finishes - dozens of times
    // on a real question paper. So the bursts are collapsed into one read per
    // frame instead of one per notification.
    let queued = 0;
    const measure = () => {
      queued = 0;
      // clientWidth excludes the scrollbar, so this cannot oscillate with it
      setFitScale(Math.min(1, outer.clientWidth / PAPER_WIDTH));
      setPaperHeight(paper.scrollHeight);
    };
    const schedule = () => {
      if (queued) return;
      queued = requestAnimationFrame(measure);
    };

    measure();
    // The paper grows as MathJax finishes rendering, so watch it as well
    const observer = new ResizeObserver(schedule);
    observer.observe(outer);
    observer.observe(paper);
    return () => {
      observer.disconnect();
      if (queued) cancelAnimationFrame(queued);
    };
  }, []);

  const scale = actualSize ? 1 : fitScale;
  // Only worth offering when the paper does not already fit
  const canZoom = fitScale < 1;

  return (
    <div className={cn("relative", className)}>
      {canZoom && (
        // Sticky, not absolute: the paper scrolls inside the sheet and the
        // control has to stay reachable. h-0 keeps it out of the layout so it
        // does not push the paper down.
        <div className="pointer-events-none sticky top-0 z-20 flex h-0 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActualSize((v) => !v)}
            // The label is what the button does, not where you are: "Full size"
            // takes you to 1:1, "Fit page" brings the whole page back.
            title={
              actualSize
                ? "Show the whole page"
                : `Show the page at full size (now ${Math.round(fitScale * 100)}%)`
            }
            className="pointer-events-auto mr-2 mt-2 h-9 gap-1.5 bg-white/90 px-2.5 text-xs shadow-sm backdrop-blur"
          >
            {actualSize ? (
              <>
                <MinimizeIcon className="h-3.5 w-3.5" /> Fit page
              </>
            ) : (
              <>
                <MaximizeIcon className="h-3.5 w-3.5" /> Full size
              </>
            )}
          </Button>
        </div>
      )}

      {/* Scrolls sideways only at actual size; when fitted there is nothing to scroll */}
      <div ref={outerRef} className={cn("w-full", actualSize && "overflow-x-auto")}>
        {/* Takes the scaled size, so the page below it sits in the right place */}
        <div
          className="overflow-hidden"
          style={{
            width: PAPER_WIDTH * scale,
            height: paperHeight ? paperHeight * scale : undefined,
          }}
        >
          <div
            ref={paperRef}
            className="origin-top-left bg-white"
            style={{ width: PAPER_WIDTH, transform: `scale(${scale})` }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaperPreview;
