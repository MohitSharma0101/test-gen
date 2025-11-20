import { Sheet, SheetContent } from "../ui/sheet";
import usePaper from "@/hooks/usePaper";
import Markdown from "../ui/markdown";
import { segregateQuestionsBySubject } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { ChevronsUpDownIcon } from "lucide-react";
import { Loader2Icon } from "lucide-react";
import EditMarkdownSheet from "./edit-markdown-sheet";
import { useEffect, useState } from "react";
import { TQuestion } from "@/models/Question";
import { putUpdateQuestion, savePaper } from "@/service/core.service";
import { toast } from "sonner";
import Link from "next/link";
import { Button, buttonVariants } from "../ui/button";
import { Checkbox } from "../ui/checkbox";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paperId: string;
  title?: string;
};

export const ViewPaperSheet = ({ open, paperId, onOpenChange }: Props) => {
  const { paper, loading, refresh } = usePaper({ id: paperId });
  const subjectQuestion = paper?.questions
    ? segregateQuestionsBySubject(paper?.questions)
    : [];
  const [selectedQuestions, setSelectedQuestions] = useState<
    Array<string | undefined>
  >([]);

  useEffect(() => {
    if (paper?.questions) {
      setSelectedQuestions(paper?.questions.map((q) => q._id?.toString()));
    }
  }, [paper]);

  const canUpdate = selectedQuestions.length != paper?.questions.length;

  const updatePaper = async () => {
    if (!canUpdate) return;
    try {
      if (!paper) return;
      await savePaper(
        paper.title,
        paper.questions.filter((q) => selectedQuestions.includes(q._id)),
        paper._id,
        paper.author,
        paper.status
      );
      toast.success("Paper Updated!");
      refresh();
    } catch (err) {
      toast.error("Something went wrong!");
    }
  };

  const updateQuestion = async (q: TQuestion) => {
    try {
      await putUpdateQuestion(q);
      refresh();
      toast.success("Successfully updated question");
    } catch (err) {
      console.error(err);
      toast.error((err as any).message || "something went wrong");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={"right"}
        className="p-0 flex flex-col gap-2 max-h-screen"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : !paper ? (
          <div className="h-full flex items-center justify-center text-destructive">
            Unable to load paper details
          </div>
        ) : (
          <>
            <div className="text-base font-medium px-2 py-3 bg-gray-200">
              {paper?.title}
            </div>
            <Link
              href={`/papers/edit/${paper._id}`}
              target="_blank"
              className={buttonVariants({
                className: "mx-2",
                variant: "outline",
              })}
            >
              Add Questions
            </Link>
            <div className="flex flex-col gap-3 py-2 overflow-y-auto">
              {subjectQuestion.map(({ subject, questions }) => (
                <div key={subject}>
                  <p className="px-2 py-3 font-semibold tracking-wide capitalize bg-slate-200 text-center">
                    {subject}
                  </p>
                  <div className="">
                    {questions.map(
                      (item, index) =>
                        item._id && (
                          <div key={index} className="border-y pt-2">
                            <div className="px-2 font-semibold flex items-center justify-between">
                              <div className="flex gap-2 items-center">
                                <Checkbox
                                  checked={selectedQuestions?.includes(
                                    item._id
                                  )}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedQuestions((prev) => [
                                        ...prev,
                                        item._id,
                                      ]);
                                    } else {
                                      setSelectedQuestions((prev) =>
                                        prev.filter((id) => id != item._id)
                                      );
                                    }
                                  }}
                                />
                                <p>Q. {index + 1}</p>
                                <EditMarkdownSheet
                                  text={item.text}
                                  onSave={(text) => {
                                    updateQuestion({
                                      id: item._id,
                                      text: text,
                                    });
                                  }}
                                />
                              </div>
                              <p>{`[${item.mark} mark]`}</p>
                            </div>
                            <Markdown text={item.text ?? ""} />

                            <Collapsible className="bg-slate-200">
                              <CollapsibleTrigger className="font-semibold w-full flex items-center justify-between p-2">
                                Explanation
                                <ChevronsUpDownIcon className="size-4" />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="flex items-start gap-1">
                                <EditMarkdownSheet
                                  text={item.ans}
                                  className="mt-2 ml-2"
                                  onSave={(text) => {
                                    updateQuestion({
                                      id: item._id,
                                      ans: text,
                                    });
                                  }}
                                />
                                <Markdown text={`Ans: ${item.ans}`} />
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        )
                    )}
                  </div>
                </div>
              ))}
            </div>
            {canUpdate && (
              <div className="border-t px-2 py-3 bg-gray-200 z-50 w-full">
                <Button className="w-full" onClick={updatePaper}>
                  Update Paper
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
