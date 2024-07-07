"use client";

import { Checkbox } from "@/components/ui/checkbox";
import SelectCompact from "@/components/ui/select-compact";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { COURSES, SUBJECT } from "@/data/const";
import useChapters from "@/hooks/useChapters";
import useQuestions from "@/hooks/useQuestions";
import { TChapter } from "@/models/Chapter";
import { TQuestion } from "@/models/Question";
import { memo, useEffect, useState } from "react";
import { MathpixMarkdown } from "mathpix-markdown-it";
import { Button } from "@/components/ui/button";
import { Columns2Icon, MenuIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Print, PrintContent, PrintTrigger } from "@/components/ui/print";
import PaperFrame from "@/components/ui/paper-frame";

const MemoizedMathpixMarkdown = memo(MathpixMarkdown);

export default function Home() {
  const [course, setCourse] = useState(COURSES[5]);
  const [subject, setSubject] = useState(SUBJECT[0]);

  const { chapters, loading: chaptersLoading } = useChapters(subject, course);
  const [selectedChapter, setSelectedChapter] = useState<TChapter | null>();
  const { questions, loading } = useQuestions(selectedChapter?._id);

  const [selectedQuestions, setSelectedQuestions] = useState<TQuestion[]>([]);
  const [twoColumn, setTwoColumn] = useState(false);

  useEffect(() => {
    if (chapters) {
      setSelectedChapter(chapters?.[0]);
    }
  }, [chapters]);

  return (
    <div className="text-primary">
      <div className="px-6 py-3 flex flex-col lg:flex-row gap-6">
        <div className="flex gap-6">
          <SelectCompact
            label="Class"
            placeholder="Select a class"
            className="w-[300px] "
            value={course}
            onChange={setCourse}
            options={COURSES.map((c) => ({
              label: c,
              value: c,
            }))}
          />
          <SelectCompact
            label="Subject"
            placeholder="Select a subject"
            className="w-[300px]"
            value={subject}
            onChange={setSubject}
            options={SUBJECT.map((c) => ({
              label: c,
              value: c,
            }))}
          />
        </div>

        <div className="flex gap-4 ml-auto items-center whitespace-nowrap">
          <p>
            Selected Questions:{" "}
            <strong>{selectedQuestions?.length || 0}</strong>
          </p>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant={"outline"}>Preview</Button>
            </SheetTrigger>
            <SheetContent
              side={"bottom"}
              className="max-h-[800px] overflow-scroll"
            >
              <PaperFrame questions={selectedQuestions} twoColumn={twoColumn} />
            </SheetContent>
          </Sheet>
          <Print>
            <PrintTrigger className="px-6">Print</PrintTrigger>
            <PrintContent>
              <PaperFrame questions={selectedQuestions} twoColumn={twoColumn} />
            </PrintContent>
          </Print>
        </div>
      </div>

      <div className="h-fit flex border-t border-slate-200 ">
        <div className="hidden md:block md:w-[300px] h-full sticky top-0">
          <div className="h-[52px] px-4 border border-slate-200 text-sm font-medium flex items-center ">
            CHAPTERS
          </div>
          <ol className=" max-h-full list-decimal flex flex-col overflow-scroll py-4 sticky top-0">
            {chaptersLoading ? (
              <>
                <Skeleton className="h-[30px] mx-4 my-1" />
                <Skeleton className="h-[30px] mx-4 my-1" />
                <Skeleton className="h-[30px] mx-4 my-1" />
                <Skeleton className="h-[30px] mx-4 my-1" />
                <Skeleton className="h-[30px] mx-4 my-1" />
              </>
            ) : (
              chapters?.map((q: TChapter, index: number) => (
                <Button
                  key={index}
                  onClick={() => {
                    setSelectedChapter(q);
                  }}
                  variant={"ghost"}
                  data-active={q._id === selectedChapter?._id}
                  className="text-start data-[active=true]:bg-slate-300 hover:bg-slate-200 p-4 justify-start rounded-none"
                >
                  {`${index + 1}. ${q.title}`}
                </Button>
              ))
            )}
          </ol>
        </div>
        <div className="flex-1 h-full">
          <div className="w-full h-[52px] px-4 border border-slate-200 text-sm font-medium flex items-center gap-4 sticky top-0 bg-slate-100 z-10">
            <Sheet>
              <SheetTrigger className="md:hidden">
                <MenuIcon className="w-4 h-4" />
              </SheetTrigger>
              <SheetContent side={"left"} className="pt-10">
                <div className="h-[52px] px-4 border border-slate-200 text-sm font-medium flex items-center ">
                  CHAPTERS
                </div>
                <ol className=" max-h-full list-decimal flex flex-col overflow-scroll py-4 sticky top-0">
                  {chaptersLoading ? (
                    <>
                      <Skeleton className="h-[30px] mx-4 my-1" />
                      <Skeleton className="h-[30px] mx-4 my-1" />
                      <Skeleton className="h-[30px] mx-4 my-1" />
                      <Skeleton className="h-[30px] mx-4 my-1" />
                      <Skeleton className="h-[30px] mx-4 my-1" />
                    </>
                  ) : (
                    chapters?.map((q: TChapter, index: number) => (
                      <Button
                        key={index}
                        onClick={() => {
                          setSelectedChapter(q);
                        }}
                        variant={"ghost"}
                        data-active={q._id === selectedChapter?._id}
                        className="text-start data-[active=true]:bg-slate-300 hover:bg-slate-200 p-4 justify-start rounded-none"
                      >
                        {`${index + 1}. ${q.title}`}
                      </Button>
                    ))
                  )}
                </ol>
              </SheetContent>
            </Sheet>
            <p>QUESTIONS</p>
            {/* <Button
              size={"sm"}
              className="ml-auto"
              onClick={() => {
                setSelectedQuestions(getRandomItems(questions));
              }}
            >
              <ShuffleIcon className="w-4 h-4" />
            </Button> */}
            <Button
              size={"sm"}
              variant={twoColumn ? "default" : "outline"}
              className="ml-auto"
              onClick={() => {
                setTwoColumn(!twoColumn);
              }}
            >
              <Columns2Icon className="w-4 h-4" />
            </Button>
          </div>
          {loading ? (
            <ol
              className={cn(
                "border-l p-4 space-y-2",
                twoColumn && "grid grid-cols-2"
              )}
            >
              <Skeleton className="w-full h-[300px]" />
              <Skeleton className="w-full h-[300px]" />
              <Skeleton className="w-full h-[300px]" />
              <Skeleton className="w-full h-[300px]" />
              <Skeleton className="w-full h-[300px]" />
            </ol>
          ) : (
            <ol
              className={cn(
                "border-l p-2 md:p-4 max-w-full overflow-scroll",
                twoColumn && "grid md:grid-cols-2"
              )}
            >
              {questions?.map((q, index) => (
                <label
                  key={index}
                  className="cursor-pointer flex items-start hover:bg-slate-100 rounded md:p-2 "
                >
                  <Checkbox
                    className="mt-[14px] "
                    checked={
                      !!selectedQuestions.find((item) => item._id === q._id)
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedQuestions([q, ...selectedQuestions]);
                      } else {
                        let updatedList = selectedQuestions;
                        updatedList = updatedList.filter(
                          (ques) => ques._id != q._id
                        );
                        setSelectedQuestions(updatedList);
                      }
                    }}
                  />
                  <span className="pt-[10px] px-2">{index + 1}. </span>
                  <div>
                    <MemoizedMathpixMarkdown text={q.text ?? ""} />
                    <div className="flex gap-1 items-center px-[10px] ">
                      <strong>Ans:</strong>{" "}
                      <MemoizedMathpixMarkdown text={q.ans || ""} />
                    </div>
                  </div>
                </label>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}