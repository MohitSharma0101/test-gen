"use client";

import {
  cn,
  getTotalMarks,
  segregateQuestionsBySubject,
  sortQuestionsByMarks,
} from "@/lib/utils";
import type { TQuestion } from "@/models/Question";
import React from "react";
import EducationPlusFrame from "./education-plus-frame";
import Markdown from "../ui/markdown";
import type { TChapter } from "@/models/Chapter";

type Props = JSX.IntrinsicElements["ol"] & {
  questions: TQuestion[];
  twoColumn?: boolean;
  course?: string;
  subject?: string;
};

const TeachersCopiesFrame = ({
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
                <span className="px-2">{q.index || 0}.</span>
                <div className="[&_#preview]:!pt-0">
                  <Markdown text={q.text ?? ""} />
                  <div className="flex gap-1 items-start">
                    <strong>Ans:</strong> <Markdown text={q.ans || ""} />
                  </div>
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
        </EducationPlusFrame>
      ))}
    </div>
  );
};

export default TeachersCopiesFrame;
