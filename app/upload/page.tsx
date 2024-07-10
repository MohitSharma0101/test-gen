"use client";

import React, { ChangeEvent, useState } from "react";
import UploadHeader from "./upload-header";
import { TQuestion } from "@/models/Question";
import { EyeIcon, FileCheckIcon, FileQuestion } from "lucide-react";
import { readFile } from "@/lib/utils";
import { extractItemsArray } from "@/lib/mdUtils";
import { uploadQuestionsInBatch } from "@/service/core.service";
import { toast } from "@/components/ui/use-toast";
import Markdown from "@/components/ui/markdown";


type Props = {};

const DashboardPage = (props: Props) => {
  const [questions, setQuestions] = useState<TQuestion[]>([]);

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
      <UploadHeader totalQuestion={questions?.length} onUpload={onUpload} />
      <div className="mt-4 border border-slate-200 grid grid-cols-2 grid-rows-4 w-full h-full">
        <label
          htmlFor="question-input"
          className="cursor-pointer hover:bg-slate-200 border border-slate-200 flex gap-4 flex-col items-center justify-center text-slate-600 font-medium"
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
          className="cursor-pointer hover:bg-slate-200 border border-slate-200 flex gap-4 flex-col items-center justify-center text-slate-600 font-medium"
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
        <div className="col-span-2 row-span-3 overflow-scroll border border-slate-200 text-slate-600 font-medium">
          <div className="w-full p-3 border-b border-slate-200 font-bold ">
            Preview Mode
          </div>
          {questions.length === 0 ? (
            <div className="w-full mt-[100px] flex gap-4 flex-col items-center justify-center">
              <EyeIcon className="w-[100px] h-[100px] " strokeWidth={1} />
              <p className="max-w-[200px] text-center">
                Upload a question set to see the preview
              </p>
            </div>
          ) : (
              <ol
                id="paper"
                className="w-full pt-3 px-8 md:px-12 list-decimal text-black print:text-black"
              >
                {questions.map((q, index) => (
                  <li key={index}>
                    <Markdown text={q.text || ""} />
                    <div className="flex gap-1 items-center px-[10px]">
                      <strong>Ans:</strong>{" "}
                      <Markdown text={q.ans || ""} />
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
