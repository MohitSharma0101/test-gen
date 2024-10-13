"use client";

import {
  cn,
  getTotalMarks,
  segregateQuestionsBySubject,
  sortQuestionsByMarks,
} from "@/lib/utils";
import type { TQuestion } from "@/models/Question";
import React, { Fragment } from "react";
import EducationPlusFrame from "./education-plus-frame";
import Markdown from "../ui/markdown";
import type { TChapter } from "@/models/Chapter";

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
  const sortedQuestion = sortQuestionsByMarks(questions);
  const subjectQuestions = segregateQuestionsBySubject(sortedQuestion, subject);
  const fallbackCourse = (questions?.[0]?.chapter as TChapter)?.course;
  const totalMarks = getTotalMarks(sortedQuestion);
  return (
    <div className="pt-4 print:px-4">
      {subjectQuestions.map(({ subject: sub, questions: q }) => (
        <EducationPlusFrame
          key={sub}
          course={course || fallbackCourse}
          subject={sub || subject}
          totalMarks={totalMarks}
          className="break-before-page"
        >
          <ol
            className={cn(
              "px-2 print:[&_#preview]:!text-base gap-1",
              twoColumn && "columns-2",
              className
            )}
            {...rest}
          >
            {q?.map((q, index) => (
              <label key={index} className="flex rounded p-1">
                <span className="pt-[10px] px-2">{q.index || 0}.</span>
                <div>
                  <Markdown text={q.text ?? ""} />
                  <code className="text-[10px] bg-slate-100 rounded p-1 w-fit h-fit print:hidden">
                    Q{q.index} ID: {q._id}
                  </code>
                </div>

                <span
                  className="pt-[10px] pr-2 font-medium ml-auto focus-visible:outline-none"
                  contentEditable
                  suppressContentEditableWarning={true}
                >
                  [{q.mark}]
                </span>
              </label>
            ))}
          </ol>
        </EducationPlusFrame>
      ))}
      <EducationPlusFrame
        course={course || fallbackCourse}
        totalMarks={totalMarks}
        className="mt-4 break-before-page"
      >
        {subjectQuestions.map(({ subject: sub, questions: q }) => (
          <Fragment key={sub}>
            <h1 className="font-medium w-full mt-4 pb-4 text-center uppercase">
              {sub}-ANSWERS
            </h1>
            <ol
              className={cn(
                "border p-2 print:[&_#preview]:!text-base c gap-1",
                twoColumn && "columns-2"
              )}
              {...rest}
            >
              {q?.map((q, index) => (
                // <label
                //   key={index}
                //   className={`flex items-baseline rounded p-1`}
                // >
                //   <span className="pt-[10px] pr-2">{q.index || 0}.</span>
                //   <Markdown text={q.ans ?? ""} />
                // </label>
                <label key={index} className="flex rounded p-1">
                  <span className="px-2">{q.index || 0}.</span>
                  <div className="[&_#preview]:!pt-0">
                    <Markdown text={q.text ?? ""} />
                    <div className="flex gap-1 items-start">
                      <strong>Ans:</strong> <Markdown text={q.ans || ""} />
                    </div>
                    <code className="text-[10px] bg-slate-100 rounded p-1 w-fit h-fit">
                      Q{q.index} ID: {q._id}
                    </code>
                  </div>
                  <span
                    className="pr-2 font-medium ml-auto focus-visible:outline-none"
                    contentEditable
                    suppressContentEditableWarning={true}
                  >
                    [{q.mark}]
                  </span>
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
