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
};

const CopyQuestionsMd = ({ questions }: Props) => {
  const getQuestionsOnly = () =>
    questions.map((q, index) => `${index + 1}. ${q.text}`).join("\n\n");
  const getAnswerOnly = () =>
    questions.map((q, index) => `${index + 1}. ${q.ans}`).join("\n\n");
  const getQuestionAndAns = () =>
    questions
      .map(
        (q, index) => `${index + 1}. ${q.text}\n\n${index + 1}. ${q.ans}`
      )
      .join("\n\n");

  const copy = (value: string) => {
    try {
      navigator.clipboard.writeText(value);
      toast({
        title: "Copied!",
        variant: "success",
      });
    } catch {
      toast({
        title: "Unable to copy!",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants()}>
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
