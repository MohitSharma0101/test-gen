'use client';

import { MathpixMarkdownProps } from "mathpix-markdown-it/lib/components/mathpix-markdown";
import dynamic from "next/dynamic";
import React, { memo } from "react";
import { Skeleton } from "./skeleton";
import { installMarkdownCache } from "@/lib/markdownCache";

// The cache is installed on the module as it loads, so every Markdown in the
// app benefits and the library is still only pulled in on demand. Converting
// the same text twice - which a paper does constantly - becomes free.
const MathpixMarkdown = dynamic(
  () =>
    import("mathpix-markdown-it").then((comp) => {
      installMarkdownCache(comp.MathpixMarkdownModel as any);
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
