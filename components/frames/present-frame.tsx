"use client";

import type { TQuestion } from "@/models/Question";
import React from "react";
import Markdown from "../ui/markdown";

type Props = JSX.IntrinsicElements["ol"] & {
  questions: TQuestion[];
};

const PresntFrame = ({ questions = [] }: Props) => {
  return (
    <div className=" pt-4 print:px-4">
      {questions.map((q, index) => (
        <div
          key={q._id}
          className="print:break-before-page h-screen flex relative"
        >
          <div
            style={{
              backgroundImage: "url('/education-plus-logo.png')",
            }}
            className="absolute inset-0 w-full h-full bg-no-repeat bg-center bg-contain opacity-25 print:bg-[length:200px] pointer-events-none"
          />
          <span className="pt-[10px] px-2">{index + 1}.</span>
          <Markdown text={q.text ?? ""} />
        </div>
      ))}
    </div>
  );
};

export default PresntFrame;
