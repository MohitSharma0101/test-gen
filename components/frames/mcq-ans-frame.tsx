import React from "react";
import EducationPlusFrame from "./education-plus-frame";
import type { TQuestion } from "@/models/Question";
import { segregateQuestionsBySubject, sortQuestionsByMarks } from "@/lib/utils";

type Props = {
  questions?: TQuestion[];
};

const MCQAnsFrame = ({ questions }: Props) => {
  // Grouped by subject exactly as the paper is, so these numbers line up with
  // the numbers printed on it. This frame used to read an `index` that only
  // existed because PaperFrame happened to have written it onto the same
  // question objects first - which left the key out of order on a paper
  // covering more than one subject, and unset when the paper was never shown.
  const sortedQuestions = segregateQuestionsBySubject(
    sortQuestionsByMarks(questions)
  ).flatMap((group) => group.questions);
  return (
    <EducationPlusFrame hideSecondaryHeader className="mt-4 break-before-page">
      <h1 className="font-medium w-full mt-4 pb-4 text-center uppercase">
        ANSWERS
      </h1>
      <ol
        className={
          "grid grid-cols-10 border p-2 print:[&_#preview]:!text-base gap-1"
        }
      >
        {sortedQuestions?.map(({ _id, ans, index }, normalIndex) => {
          const mcqAns = ans?.split("\n")?.[0]?.slice(0, 2);
          return (
            // Keyed on the question, not its answer: a paper has far more
            // questions than it has distinct answers
            <label key={_id ?? normalIndex} className={`p-1`}>
              {index || normalIndex + 1}. {mcqAns}
            </label>
          );
        })}
      </ol>
    </EducationPlusFrame>
  );
};

export default MCQAnsFrame;
