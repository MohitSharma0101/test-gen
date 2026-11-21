'use client';

import type { MathpixMarkdownProps } from "mathpix-markdown-it/lib/components/mathpix-markdown";
import React, { ComponentType, memo, useEffect, useState } from "react";
import { installMarkdownCache } from "@/lib/markdownCache";

type TMathpixMarkdown = ComponentType<MathpixMarkdownProps>;

// The library (~1.2 MB gzipped) is pulled in only when some Markdown renders.
// As it loads, two things happen once for the whole app:
// - the conversion cache is installed, so converting the same text twice
//   (which a paper does constantly) is free;
// - the math stylesheets are added to <head>. That used to need
//   <MathpixLoader> mounted in the app shell, which made every page download
//   the library even with no math on it. loadMathJax is idempotent (it checks
//   for its own style elements).
// One promise for the whole app, so every <Markdown> waits on the same download.
let loaded: TMathpixMarkdown | null = null;
let loading: Promise<TMathpixMarkdown> | null = null;
const loadMathpix = () =>
  (loading ??= import("mathpix-markdown-it").then((comp) => {
    installMarkdownCache(comp.MathpixMarkdownModel as any);
    try {
      comp.MathpixMarkdownModel.loadMathJax();
    } catch {
      // Styles are cosmetic; text still renders without them
    }
    loaded = comp.MathpixMarkdown as unknown as TMathpixMarkdown;
    return loaded;
  }));

/**
 * While the library loads: faint, still lines shaped like the text that is
 * coming (no pulsing box). They fade in only after 150 ms, so a quick load
 * (the usual case once the library is cached) shows nothing at all.
 */
function TextPlaceholder({ text }: { text?: string }) {
  const lines = Math.min(4, Math.max(1, Math.ceil((text?.length ?? 0) / 90)));
  return (
    <div
      aria-hidden="true"
      className="space-y-2.5 py-1 motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-both motion-safe:delay-150 motion-safe:duration-200"
    >
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={`h-2.5 rounded-full bg-muted ${i === lines - 1 && lines > 1 ? "w-3/5" : "w-full"}`} />
      ))}
    </div>
  );
}

const Markdown = (props: MathpixMarkdownProps) => {
  const [Mathpix, setMathpix] = useState<TMathpixMarkdown | null>(() => loaded);
  useEffect(() => {
    if (Mathpix) return;
    let live = true;
    loadMathpix().then((c) => live && setMathpix(() => c));
    return () => {
      live = false;
    };
  }, [Mathpix]);

  if (!Mathpix) return <TextPlaceholder text={props.text} />;
  return (
    <Mathpix
      outMath={{
        include_table_html: true,
      }}
      {...props}
    />
  );
};

export default memo(Markdown);
