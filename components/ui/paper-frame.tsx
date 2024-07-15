"use client";

import { cn, getTotalMarks, segregateQuestionsBySubject, sortQuestionsByMarks } from "@/lib/utils";
import type { TQuestion } from "@/models/Question";
import React, { Fragment } from "react";
import EducationPlusFrame from "../frames/education-plus-frame";
import Markdown from "./markdown";
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
                <Markdown text={q.text ?? ""} />
                <span
                  className="pt-[10px] pr-2 font-medium ml-auto focus-visible:outline-none"
                  contentEditable
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
                <label
                  key={index}
                  className={`flex items-baseline rounded p-1`}
                >
                  <span className="pt-[10px] pr-2">{q.index || 0}.</span>
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
