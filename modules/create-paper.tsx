"use client";

import { Checkbox } from "@/components/ui/checkbox";
import SelectCompact from "@/components/ui/select-compact";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { COURSES, SUBJECT_MAP } from "@/data/const";
import useChapters from "@/hooks/useChapters";
import useQuestions from "@/hooks/useQuestions";
import type { TChapter } from "@/models/Chapter";
import type { TQuestion } from "@/models/Question";
import { startTransition, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCheckIcon,
  Columns2Icon,
  InboxIcon,
  MenuIcon,
} from "lucide-react";
import {
  cn,
  getRandomItems,
  getTotalMarks,
  getUniqueElementsById,
  isArrayIncluded,
  removeElementsById,
} from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Print, PrintContent, PrintTrigger } from "@/components/ui/print";
import PaperFrame from "@/components/ui/paper-frame";
import Pagination from "@/components/ui/pagination";
import TimesUsed from "@/components/ui/times-used";
import RandomInput from "@/components/ui/random-input";
import FilterSelect from "@/components/ui/filter-select";
import Markdown from "@/components/ui/markdown";
import useBooks from "@/hooks/useBooks";
import SavePaperButton from "@/components/ui/save-paper-button";
import PreviewButton from "@/components/ui/preview-button";
import { TPaper } from "@/models/Paper";

type TCreatePaperProps = {
  mode?: "create" | "update";
  defaultPaper?: TPaper;
};

export default function CreatePaper({
  mode = "create",
  defaultPaper,
}: TCreatePaperProps) {
  const [course, setCourse] = useState(COURSES[5]);
  const [subject, setSubject] = useState("");
  const [book, setBook] = useState("");
  const { books, loading: booksLoading } = useBooks(subject, course);

  const { chapters, loading: chaptersLoading } = useChapters(
    subject,
    course,
    book
  );
  const [selectedChapter, setSelectedChapter] = useState<TChapter | null>();
  const {
    questions,
    loading,
    lastIndex,
    totalPages,
    totalQuestions,
    updateUsage,
  } = useQuestions(selectedChapter?._id);

  const [selectedQuestions, setSelectedQuestions] = useState<TQuestion[]>(
    defaultPaper?.questions || []
  );

  const [twoColumn, setTwoColumn] = useState(true);
  const allSelected = isArrayIncluded(questions ?? [], selectedQuestions);

  useEffect(() => {
    if (chapters) {
      setSelectedChapter(chapters?.[0]);
    }
  }, [chapters]);

  return (
    <div className="text-primary max-h-screen flex flex-col">
      <div className="px-6 pt-2 pb-4 flex flex-col lg:flex-row gap-6 bg-slate-100">
        <div className="flex flex-wrap gap-2 md:gap-4">
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
            emptyState="Select a Class first"
            value={subject}
            onChange={setSubject}
            options={SUBJECT_MAP[course].map((c) => ({
              label: c,
              value: c,
            }))}
          />
          <SelectCompact
            label="Book"
            placeholder="Select a book"
            className="w-[300px]"
            value={book}
            onChange={setBook}
            options={books.map((b) => ({
              label: b.title,
              value: b._id,
            }))}
            loading={booksLoading}
          />
        </div>

        <div className="flex flex-wrap gap-4 ml-auto justify-end items-center whitespace-nowrap">
          <div className="flex md:flex-col gap-2 md:gap-0">
            <p>
              Selected Questions:{" "}
              <strong>{selectedQuestions?.length || 0}</strong>
            </p>
            <p>
              Total Marks: <strong>{getTotalMarks(selectedQuestions)}</strong>
            </p>
          </div>
          <div className="flex gap-2">
            <SavePaperButton
              id={defaultPaper?._id}
              defaultTitle={defaultPaper?.title}
              questions={selectedQuestions}
            />
            <PreviewButton
              questions={selectedQuestions}
              onPrint={() => updateUsage(selectedQuestions)}
              defaultTwoColumn={twoColumn}
            />
            <Print>
              <PrintTrigger
                className="px-6"
                onClick={async () => {
                  startTransition(() => {
                    updateUsage(selectedQuestions);
                  });
                }}
              >
                Print
              </PrintTrigger>
              <PrintContent>
                <PaperFrame
                  questions={selectedQuestions}
                  twoColumn={twoColumn}
                  course={course}
                  subject={subject}
                />
              </PrintContent>
            </Print>
          </div>
        </div>
      </div>

      <div className="h-fit flex-grow overflow-y-scroll flex border-t border-slate-200">
        <div className="hidden md:block md:w-[200px] lg:w-[300px] h-full sticky top-0">
          <div className="h-[52px] px-4 border border-slate-200 text-sm font-medium flex items-center ">
            CHAPTERS
          </div>
          <ol className=" max-h-full list-decimal flex flex-col overflow-scroll scrollbar-hide py-4">
            {chaptersLoading ? (
              <>
                <Skeleton className="h-[30px] mx-4 my-1" />
                <Skeleton className="h-[30px] mx-4 my-1" />
                <Skeleton className="h-[30px] mx-4 my-1" />
                <Skeleton className="h-[30px] mx-4 my-1" />
                <Skeleton className="h-[30px] mx-4 my-1" />
              </>
            ) : !chapters || chapters?.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full py-12 px-4 text-slate-400">
                <InboxIcon className="w-[100px] h-[100px]" strokeWidth={1.4} />
                <p className="text-lg">No Chapter Found!</p>
              </div>
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
          <div className="sticky top-0 w-full max-w-[100vw] overflow-scroll scrollbar-hide h-[52px] px-2 md:px-4 border border-slate-200 text-sm font-medium flex items-center gap-2 md:gap-4 bg-slate-100 z-10">
            <Sheet>
              <SheetTrigger className="md:hidden">
                <MenuIcon className="w-4 h-4" />
              </SheetTrigger>
              <SheetContent side={"left"} className="pt-10">
                <div className="h-[52px] px-4 border border-slate-200 text-sm font-medium flex items-center ">
                  CHAPTERS
                </div>
                <ol className=" max-h-full list-decimal flex flex-col overflow-scroll scrollbar-hide py-4 sticky top-0">
                  {chaptersLoading ? (
                    <>
                      <Skeleton className="h-[30px] mx-4 my-1" />
                      <Skeleton className="h-[30px] mx-4 my-1" />
                      <Skeleton className="h-[30px] mx-4 my-1" />
                      <Skeleton className="h-[30px] mx-4 my-1" />
                      <Skeleton className="h-[30px] mx-4 my-1" />
                    </>
                  ) : chapters?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center w-full py-12 px-4 text-slate-400">
                      <InboxIcon
                        className="w-[100px] h-[100px]"
                        strokeWidth={1.4}
                      />
                      <p className="text-lg">No Chapter Found!</p>
                    </div>
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
            <p className="whitespace-nowrap">
              QUESTIONS {totalQuestions ? `(${totalQuestions})` : ""}
            </p>
            {questions?.length > 0 && (
              <Button
                size={"sm"}
                variant={allSelected ? "default" : "outline"}
                className="border"
                onClick={() => {
                  if (allSelected) {
                    setSelectedQuestions(
                      removeElementsById(selectedQuestions, questions)
                    );
                  } else {
                    setSelectedQuestions(
                      getUniqueElementsById([
                        ...selectedQuestions,
                        ...questions,
                      ])
                    );
                  }
                }}
              >
                <CheckCheckIcon className="w-4 h-4" />
              </Button>
            )}

            {totalPages ? <Pagination totalPages={totalPages} /> : null}
            {questions?.length > 0 && (
              <RandomInput
                onSubmit={(random) => {
                  setSelectedQuestions(getRandomItems(questions, random));
                }}
              />
            )}

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
          <div className="py-1 px-4">
            <FilterSelect
              filterKey="marks"
              className="w-fit"
              placeholder="marks"
              options={Array.from(
                new Set(questions?.map((q) => q.mark) ?? [])
              ).map((mark) => ({
                label: mark + " mark",
                value: (mark || 1).toString(),
              }))}
            />
          </div>
          {loading ? (
            <ol
              className={cn(
                "border-l p-4 grid gap-4",
                twoColumn && "grid-cols-2"
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
                "border-l p-2 md:p-4 max-w-full",
                twoColumn && "grid grid-cols-2"
              )}
            >
              {!questions || questions?.length == 0 ? (
                <div className="col-span-2 flex flex-col items-center justify-center w-full py-12 px-4 text-slate-400">
                  <InboxIcon
                    className="w-[100px] h-[100px]"
                    strokeWidth={1.4}
                  />
                  <p className="text-lg">No Question Found!</p>
                </div>
              ) : (
                questions?.map((q, index) => (
                  <label
                    key={index}
                    className="cursor-pointer flex items-start hover:bg-slate-100 rounded md:p-2 text-sm md:text-base [&_#preview]:!px-0 [&_#preview]:!max-w-[300px] md:[&_#preview]:!max-w-full "
                  >
                    <div className="mt-[14px] flex flex-col items-center justify-center gap-4">
                      <div className="flex flex-col gap-2">
                        <Checkbox
                          checked={
                            !!selectedQuestions.find(
                              (item) => item._id === q._id
                            )
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
                        <TimesUsed count={q.timesUsed} />
                      </div>
                    </div>
                    <span className="pt-[10px] px-2">
                      {lastIndex + index + 1}.{" "}
                    </span>
                    <div>
                      <Markdown text={q.text ?? ""} />
                      <div className="flex gap-2 items-start [&_#preview]:!py-0">
                        <strong>Ans:</strong> <Markdown text={q.ans || ""} />
                      </div>
                    </div>
                    <span className="pt-[10px] px-2 font-medium ml-auto">
                      [{q.mark}]
                    </span>
                  </label>
                ))
              )}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
