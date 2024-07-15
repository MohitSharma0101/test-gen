"use client";

import React, { ChangeEvent, useState } from "react";
import UploadHeader from "./upload-header";
import type { TQuestion } from "@/models/Question";
import {
  Columns2Icon,
  EyeIcon,
  FileCheckIcon,
  FileQuestion,
} from "lucide-react";
import { cn, readFile } from "@/lib/utils";
import { extractItemsArray } from "@/lib/mdUtils";
import { uploadQuestionsInBatch } from "@/service/core.service";
import { toast } from "@/components/ui/use-toast";
import Markdown from "@/components/ui/markdown";
import { Button } from "@/components/ui/button";

type Props = {};

const DashboardPage = (props: Props) => {
  const [questions, setQuestions] = useState<TQuestion[]>([]);
  const [twoColumn, setTwoColumn] = useState(true);

  const onQuestionChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file, (content) => {
        const items = extractItemsArray(content);
        const ques: TQuestion[] = [];
        for (let i = 0; i < items.length; i++) {
          ques.push({
            text: items[i],
          });
        }
        setQuestions(ques);
      });
    }
  };

  const onAnswerChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file, (content) => {
        const items = extractItemsArray(content);
        let ques = questions;
        ques = ques.map((q, index) => ({
          ...q,
          ans: items[index],
        }));
        setQuestions([...ques]);
      });
    }
  };

  const onUpload = async (chapter: string, mark: string) => {
    try {
      if (questions.length > 0) {
        await uploadQuestionsInBatch(
          questions.map((q) => ({
            ...q,
            chapter: chapter,
            mark: Number(mark),
          }))
        );
        toast({
          title: `🎉 Successfully Uploaded ${questions.length} questions.`,
          variant: "success",
        });
      } else {
        toast({
          title: `Please add questions!`,
          variant: "destructive",
        });
      }

      setQuestions([]);
    } catch (err) {
      toast({
        title: `Uploaded failed.`,
        variant: "destructive",
      });
      console.log("ERR", err);
    }
  };

  return (
    <div className="h-screen text-primary">
      <UploadHeader
        onUpload={onUpload}
        questions={questions}
        twoColumn={twoColumn}
      />
      <div className="mt-4 border border-slate-200 w-full h-full">
        <div className="flex">
          <label
            htmlFor="question-input"
            className="w-1/2 p-10 cursor-pointer hover:bg-slate-200 border border-slate-200 flex gap-4 flex-col items-center justify-center text-slate-600 font-medium"
          >
            <FileQuestion className="w-[100px] h-[100px]" strokeWidth={1} />
            <p>Upload Question Set</p>
            <input
              id="question-input"
              className="hidden"
              type="file"
              accept=".md"
              onChange={onQuestionChange}
            />
          </label>
          <label
            htmlFor="answer-input"
            className="w-1/2 p-10 cursor-pointer hover:bg-slate-200 border border-slate-200 flex gap-4 flex-col items-center justify-center text-slate-600 font-medium"
          >
            <FileCheckIcon className="w-[100px] h-[100px]" strokeWidth={1} />
            <p>Upload Answer Set</p>
            <input
              id="answer-input"
              className="hidden"
              type="file"
              accept=".md"
              onChange={onAnswerChange}
            />
          </label>
        </div>

        <div className="scrollbar-hide overflow-scroll border border-slate-200 text-slate-600 font-medium">
          <div className="w-full p-3 border-b border-slate-200 font-bold ">
            Preview Mode
            <Button
              size={"sm"}
              variant={twoColumn ? "default" : "outline"}
              className="ml-4"
              onClick={() => {
                setTwoColumn(!twoColumn);
              }}
            >
              <Columns2Icon className="w-4 h-4" />
            </Button>
          </div>
          {questions.length === 0 ? (
            <div className="w-full my-[100px] flex gap-4 flex-col items-center justify-center">
              <EyeIcon className="w-[100px] h-[100px] " strokeWidth={1} />
              <p className="max-w-[200px] text-center">
                Upload a question set to see the preview
              </p>
            </div>
          ) : (
            <ol
              id="paper"
              className={cn(
                "w-full pt-3 px-8 md:px-12 list-decimal text-black print:text-black [&_#preview]:!pt-0",
                twoColumn && "columns-2"
              )}
            >
              {questions.map((q, index) => (
                <li key={index}>
                  <Markdown text={q.text || ""} />
                  <div className="flex gap-1 items-start">
                    <strong>Ans:</strong> <Markdown text={q.ans || ""} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
