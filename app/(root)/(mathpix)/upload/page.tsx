"use client";

import React, { useEffect, useState } from "react";
import UploadHeader from "./upload-header";
import type { TQuestion } from "@/models/Question";
import {
  Columns2Icon,
  EyeIcon,
  FileCheckIcon,
  FileDigitIcon,
  FileQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { extractItemsArray } from "@/lib/mdUtils";
import { uploadQuestionsInBatch } from "@/service/core.service";
import { toast } from "@/components/ui/use-toast";
import Markdown from "@/components/ui/markdown";
import { Button } from "@/components/ui/button";
import UploadInput from "./upload-input";

type Props = {};

const DashboardPage = (props: Props) => {
  const [questions, setQuestions] = useState<TQuestion[]>([]);
  const [twoColumn, setTwoColumn] = useState(true);
  const [questionContent, setQuestionContent] = useState("");
  const [ansContent, setAnsContent] = useState("");
  const [questionAnsContent, setQuestionAnsContent] = useState("");

  useEffect(() => {
    if (questionContent) {
      const items = extractItemsArray(questionContent);
      const ques: TQuestion[] = [];
      for (let i = 0; i < items.length; i++) {
        ques.push({
          text: items[i],
        });
      }
      setQuestions(ques);
    }
  }, [questionContent]);

  useEffect(() => {
    if (ansContent) {
      const items = extractItemsArray(ansContent);
      let ques = questions;
      ques = ques.map((q, index) => ({
        ...q,
        ans: items[index],
      }));
      setQuestions([...ques]);
    }
  }, [ansContent]);

  useEffect(() => {
    if (questionAnsContent) {
      const items = extractItemsArray(questionAnsContent);
      const ques: TQuestion[] = [];
      for (let i = 0; i < items.length; i++) {
        ques.push({
          text: items[i],
          ans: items?.[i + 1],
        });
        i++;
      }
      setQuestions(ques);
    }
  }, [questionAnsContent]);

  const onUpload = async (chapter: string, mark: string, tags?: string[]) => {
    try {
      if (questions.length > 0) {
        await uploadQuestionsInBatch(
          questions.map((q) => ({
            ...q,
            chapter: chapter,
            mark: Number(mark),
            tags: tags
          }))
        );
        toast({
          title: `🎉 Successfully Uploaded ${questions.length} questions.`,
          variant: "success",
        });
        setQuestions([]);
        setQuestionContent("");
        setAnsContent("");
      } else {
        toast({
          title: `Please add questions!`,
          variant: "destructive",
        });
      }
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
          <UploadInput
            id="question-input"
            label="Upload Question Set"
            icon={
              <FileQuestion className="w-[100px] h-[100px]" strokeWidth={1} />
            }
            text={questionContent}
            onChange={setQuestionContent}
          />
          <UploadInput
            id="ans-input"
            label="Upload Answer Set"
            icon={
              <FileCheckIcon className="w-[100px] h-[100px]" strokeWidth={1} />
            }
            text={ansContent}
            onChange={setAnsContent}
          />
          <UploadInput
            id="question-ans-input"
            label="Upload Questions & Answer Set"
            icon={
              <FileDigitIcon className="w-[100px] h-[100px]" strokeWidth={1} />
            }
            text={questionAnsContent}
            onChange={setQuestionAnsContent}
          />
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
