import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { buttonVariants } from "./button";
import { ChevronDownIcon } from "lucide-react";
import { TQuestion } from "@/models/Question";
import { toast } from "./use-toast";

type Props = {
  questions: TQuestion[];
  // Trigger styling; defaults to the primary button
  className?: string;
};

// Markdown builders + clipboard helper, shared with the preview's More menu
export const questionsMd = (questions: TQuestion[]) =>
  questions.map((q, index) => `${index + 1}. ${q.text}`).join("\n\n");
export const answersMd = (questions: TQuestion[]) =>
  questions.map((q, index) => `${index + 1}. ${q.ans}`).join("\n\n");
export const questionsAndAnswersMd = (questions: TQuestion[]) =>
  questions.map((q, index) => `${index + 1}. ${q.text}\n\n${index + 1}. ${q.ans}`).join("\n\n");

export const copyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast({ title: "Copied!", variant: "success" });
  } catch {
    toast({ title: "Unable to copy!", variant: "destructive" });
  }
};

const CopyQuestionsMd = ({ questions, className }: Props) => {
  const getQuestionsOnly = () => questionsMd(questions);
  const getAnswerOnly = () => answersMd(questions);
  const getQuestionAndAns = () => questionsAndAnswersMd(questions);
  const copy = copyText;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={className ?? buttonVariants()}>
        Copy
        <ChevronDownIcon className="w-4 h-4 ml-1" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Choose</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => copy(getQuestionsOnly())}
          className="cursor-pointer"
        >{`Copy Questions (.md)`}</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => copy(getAnswerOnly())}
          className="cursor-pointer"
        >{`Copy Answers (.md)`}</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => copy(getQuestionAndAns())}
          className="cursor-pointer"
        >{`Copy Question & Answers (.md)`}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CopyQuestionsMd;
