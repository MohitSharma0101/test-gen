"use client";

import { cn } from "@/lib/utils";
import { TQuestion } from "@/models/Question";
import { MathpixMarkdown } from "mathpix-markdown-it";
import React, { memo } from "react";

type Props = JSX.IntrinsicElements["ol"] & {
  questions: TQuestion[];
  twoColumn?: boolean;
};

const MemoizedMathpixMarkdown = memo(MathpixMarkdown);

const PaperFrame = ({
  questions = [],
  twoColumn = false,
  className,
  ...rest
}: Props) => {
  return (
    <ol
      className={cn("border p-4 ", twoColumn && "columns-2", className)}
      {...rest}
    >
      {questions?.map((q, index) => (
        <label key={index} className="flex items-start  rounded p-2">
          <span className="pt-[10px] px-2">{index + 1}.</span>
          <MemoizedMathpixMarkdown text={q.text ?? ""} />
        </label>
      ))}
    </ol>
  );
};

export default PaperFrame;
