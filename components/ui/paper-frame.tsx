"use client";

import { cn } from "@/lib/utils";
import { TQuestion } from "@/models/Question";
import React, { memo } from "react";
import EducationPlusFrame from "../frames/education-plus-frame";
import Markdown from "./markdown";

type Props = JSX.IntrinsicElements["ol"] & {
  questions: TQuestion[];
  twoColumn?: boolean;
  course?: string;
  subject?: string;
};

const MemoizedMathpixMarkdown = memo(Markdown);

const PaperFrame = ({
  questions = [],
  twoColumn = false,
  className,
  course,
  subject,
  ...rest
}: Props) => {
  return (
    <div className="pt-4 print:px-4">
      <EducationPlusFrame course={course} subject={subject}>
        <ol
          className={cn("px-2", twoColumn && "columns-2", className)}
          {...rest}
        >
          {questions?.map((q, index) => (
            <label
              key={index}
              className="flex items-baseline rounded p-2 break-inside-avoid "
            >
              <span className="pt-[10px] px-2">{index + 1}.</span>
              <MemoizedMathpixMarkdown text={q.text ?? ""} />
              <span
                className="pt-[10px] px-2 font-medium ml-auto focus-visible:outline-none"
                contentEditable
              >
                [{q.mark}]
              </span>
            </label>
          ))}
        </ol>
      </EducationPlusFrame>
      <div className="w-full h-5 break-before-page" />
      <EducationPlusFrame
        course={course}
        subject={subject}
        className="mt-4 print:mt-0"
      >
        <h1 className="font-medium w-full mt-4 pb-4 text-center">ANSWERS</h1>
        <ol
          className={cn(
            "border p-4 grid grid-cols-8 [&_#preview]:!px-0 [&_#preview]:!max-w-[300px] md:[&_#preview]:!max-w-full md:[&_#preview]:!min-w-fit"
          )}
          {...rest}
        >
          {questions?.map((q, index) => (
            <label
              key={index}
              className={`flex items-baseline rounded p-2 ${
                q.ans && q.ans?.length > 30 ? "col-span-4" : ""
              } `}
            >
              <span className="pt-[10px] px-2">{index + 1}.</span>
              <MemoizedMathpixMarkdown text={q.ans ?? ""} />
            </label>
          ))}
        </ol>
      </EducationPlusFrame>
    </div>
  );
};

export default PaperFrame;
