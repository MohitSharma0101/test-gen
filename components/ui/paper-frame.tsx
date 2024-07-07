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
    <div>
      <h1 className="font-medium w-full pb-4 text-center">QUESTIONS</h1>
      <ol
        className={cn("border p-4 mt-4", twoColumn && "columns-2", className)}
        {...rest}
      >
        {questions?.map((q, index) => (
          <label key={index} className="flex items-baseline  rounded p-2">
            <span className="pt-[10px] px-2">{index + 1}.</span>
            <MemoizedMathpixMarkdown text={q.text ?? ""} />
            <span className="pt-[10px] px-2 font-medium ml-auto">
              [{q.mark}]
            </span>
          </label>
        ))}
      </ol>
      <h1 className="font-medium w-full mt-8 pb-4 text-center break-before-page">
        ANSWERS
      </h1>
      <ol
        className={cn(
          "border p-4 flex flex-wrap [&_#preview]:!px-0 [&_#preview]:!max-w-[300px] md:[&_#preview]:!max-w-full "
        )}
        {...rest}
      >
        {questions?.map((q, index) => (
          <label
            key={index}
            className="flex items-baseline justify-center rounded p-2"
          >
            <span className="pt-[10px] px-2">{index + 1}.</span>
            <MemoizedMathpixMarkdown text={q.ans ?? ""} />
          </label>
        ))}
      </ol>
    </div>
  );
};

export default PaperFrame;
