'use client';

import type { MathpixMarkdownProps } from "mathpix-markdown-it/lib/components/mathpix-markdown";
import dynamic from "next/dynamic";
import React, { memo } from "react";
import { Skeleton } from "./skeleton";
import { installMarkdownCache } from "@/lib/markdownCache";

// The library (~1.2 MB gzipped) is pulled in only when some Markdown renders.
// As it loads, two things happen once for the whole app:
// - the conversion cache is installed, so converting the same text twice
//   (which a paper does constantly) is free;
// - the math stylesheets are added to <head>. That used to need
//   <MathpixLoader> mounted in the app shell, which made every page download
//   the library even with no math on it. loadMathJax is idempotent (it checks
//   for its own style elements).
const MathpixMarkdown = dynamic(
  () =>
    import("mathpix-markdown-it").then((comp) => {
      installMarkdownCache(comp.MathpixMarkdownModel as any);
      try {
        comp.MathpixMarkdownModel.loadMathJax();
      } catch {
        // Styles are cosmetic; text still renders without them
      }
      return comp.MathpixMarkdown;
    }),
  { ssr: false, loading: () => <Skeleton className="w-[100px] h-[100px]" /> }
);

const Markdown = (props: MathpixMarkdownProps) => {
  return (
    <MathpixMarkdown
      outMath={{
        include_table_html: true,
      }}
      {...props}
    />
  );
};

export default memo(Markdown);
