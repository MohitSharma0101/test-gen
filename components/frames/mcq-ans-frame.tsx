import React from "react";
import EducationPlusFrame from "./education-plus-frame";
import { TQuestion } from "@/models/Question";

type Props = {
  questions?: TQuestion[];
};

const MCQAnsFrame = ({ questions }: Props) => {
  return (
    <EducationPlusFrame hideSecondaryHeader className="mt-4 break-before-page">
      <h1 className="font-medium w-full mt-4 pb-4 text-center uppercase">
        ANSWERS
      </h1>
      <ol
        className={"grid grid-cols-10 border p-2 print:[&_#preview]:!text-base gap-1"}
      >
        {questions?.map(({ ans, index }) => {
          const mcqAns = ans?.split("\n")?.[0]?.slice(0, 2);
          return (
            <label key={mcqAns} className={`p-1`}>
              {index || 0}. {mcqAns}
            </label>
          );
        })}
      </ol>
    </EducationPlusFrame>
  );
};

export default MCQAnsFrame;
