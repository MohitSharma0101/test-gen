"use client";

import { cn, segregateQuestionsBySubject } from "@/lib/utils";
import type { TQuestion } from "@/models/Question";
import React, { Fragment } from "react";
import EducationPlusFrame from "../frames/education-plus-frame";
import Markdown from "./markdown";

type Props = JSX.IntrinsicElements["ol"] & {
  questions: TQuestion[];
  twoColumn?: boolean;
  course?: string;
  subject?: string;
};

const PaperFrame = ({
  questions = [],
  twoColumn = false,
  className,
  course,
  subject,
  ...rest
}: Props) => {
  const subjectQuestions = segregateQuestionsBySubject(questions);
  return (
    <div className="pt-4 print:px-4">
      {subjectQuestions.map(({ subject: sub, questions: q }) => (
        <EducationPlusFrame
        key={sub}
          course={course}
          subject={sub}
          className="break-before-page"
        >
          <ol
            className={cn("px-2", twoColumn && "columns-2", className)}
            {...rest}
          >
            {q?.map((q, index) => (
              <label key={index} className="flex items-baseline rounded p-2">
                <span className="pt-[10px] px-2">{q.index || 0}.</span>
                <Markdown text={q.text ?? ""} />
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
      ))}
      <EducationPlusFrame course={course} className="mt-4 break-before-page">
        {subjectQuestions.map(({ subject: sub, questions: q }) => (
          <Fragment key={sub}>
            <h1 className="font-medium w-full mt-4 pb-4 text-center uppercase">
              {sub}-ANSWERS
            </h1>
            <ol
              className={cn(
                "border p-4 [&_#preview]:!px-0 [&_#preview]:!max-w-[300px] md:[&_#preview]:!max-w-full md:[&_#preview]:!min-w-fit",
                twoColumn && "columns-2"
              )}
              {...rest}
            >
              {q?.map((q, index) => (
                <label
                  key={index}
                  className={`flex items-baseline rounded p-2`}
                >
                  <span className="pt-[10px] px-2">{q.index || 0}.</span>
                  <Markdown text={q.ans ?? ""} />
                </label>
              ))}
            </ol>
          </Fragment>
        ))}
      </EducationPlusFrame>
    </div>
  );
};

export default PaperFrame;
