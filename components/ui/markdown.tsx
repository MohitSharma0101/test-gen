import { MathpixMarkdownProps } from "mathpix-markdown-it/lib/components/mathpix-markdown";
import dynamic from "next/dynamic";
import React, { memo } from "react";
import { Skeleton } from "./skeleton";

const MathpixMarkdown = dynamic(
  () => import("mathpix-markdown-it").then((comp) => comp.MathpixMarkdown),
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
