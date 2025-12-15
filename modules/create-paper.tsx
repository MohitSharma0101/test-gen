"use client";

import { Checkbox } from "@/components/ui/checkbox";
import SelectCompact from "@/components/ui/select-compact";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MARKS } from "@/data/const";
import useChapters from "@/hooks/useChapters";
import useQuestions from "@/hooks/useQuestions";
import type { TChapter } from "@/models/Chapter";
import type { TQuestion } from "@/models/Question";
import { startTransition, useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CheckCheckIcon, Columns2Icon, InboxIcon, MenuIcon, RefreshCcw } from "lucide-react";
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
import PaperFrame from "@/components/frames/paper-frame";
import Pagination from "@/components/ui/pagination";
import TimesUsed from "@/components/ui/times-used";
import RandomInput from "@/components/ui/random-input";
import Markdown from "@/components/ui/markdown";
import useBooks from "@/hooks/useBooks";
import SavePaperButton from "@/components/ui/save-paper-button";
import PreviewButton from "@/components/ui/preview-button";
import { TPaper } from "@/models/Paper";
import { useAuthorStore } from "@/stores/authorStore";
import AddTagSheet, { TAGS } from "@/components/sheets/add-tag-sheet";
import EditMarkdownSheet from "@/components/sheets/edit-markdown-sheet";
import { Input } from "@/components/ui/input";
import { useCourses } from "@/hooks/useCourses";

type TCreatePaperProps = {
  mode?: "create" | "update";
  defaultPaper?: TPaper;
};

export default function CreatePaper({ defaultPaper }: TCreatePaperProps) {
  const defaultChapter = defaultPaper?.questions?.[0]?.chapter as TChapter | null;

  const { course, subject, setCourse, setSubject, courses, subjects } = useCourses({
    defaultCourse: defaultPaper?.course,
    defaultSubject: defaultChapter?.subject,
  });
  const [marks, setMarks] = useState("");
  const [book, setBook] = useState(defaultChapter?.book || "");
  const { books, loading: booksLoading } = useBooks(subject, course);
  const { author } = useAuthorStore();
  const [selectedTag, setSelectedTag] = useState("");
  const [hideUsed, setHideUsed] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");

  const { chapters, loading: chaptersLoading } = useChapters(subject, course, book);
  const [selectedChapter, setSelectedChapter] = useState<TChapter | null>();
  const { questions, loading, lastIndex, totalPages, totalQuestions, refresh, updateUsage, updateQuestion } =
    useQuestions(selectedChapter?._id, marks, undefined, selectedTag, hideUsed ? 0 : undefined);

  const chapterToShow = chapters?.filter((c) => c.title.toLowerCase().includes(chapterSearch.toLowerCase()));

  const [selectedQuestions, setSelectedQuestions] = useState<TQuestion[]>(defaultPaper?.questions || []);

  const [twoColumn, setTwoColumn] = useState(true);
  const allSelected = isArrayIncluded(questions ?? [], selectedQuestions);

  useEffect(() => {
    if (chapters) {
      setSelectedChapter(defaultChapter || chapters?.[0]);
      setChapterSearch("");
    }
  }, [chapters]);

  return (
    <div className="text-primary max-h-screen flex flex-col">
      <div className="px-3 md:px-6 pt-2 pb-2 md:pb-4 flex flex-col lg:flex-row gap-2 md:gap-6 bg-slate-100">
        <div className="grid grid-cols-2 md:flex flex-wrap gap-2 md:gap-4">
          <SelectCompact
            label="Class"
            placeholder="Select a class"
            className="md:w-[250px] "
            value={course}
            onChange={setCourse}
            options={courses.map((c) => ({
              label: c,
              value: c,
            }))}
          />
          <SelectCompact
            label="Subject"
            placeholder="Select a subject"
            className="md:w-[250px]"
            emptyState="Select a Class first"
            value={subject}
            onChange={setSubject}
            options={subjects.map((c) => ({
              label: c,
              value: c,
            }))}
          />
          <SelectCompact
            label="Book"
            placeholder="Select a book"
            className="md:w-[250px]"
            value={book}
            onChange={setBook}
            options={books.map((b) => ({
              label: b.title,
              value: b._id,
            }))}
            loading={booksLoading}
          />
          <SelectCompact
            label="Marks"
            className="w-fit"
            value={marks}
            onChange={setMarks}
            placeholder="Filter by marks"
            options={MARKS.map((mark) => ({
              label: mark + " mark",
              value: (mark || 1).toString(),
            }))}
            canUnselect
          />
          <SelectCompact
            label="Tags"
            className="w-fit"
            value={selectedTag}
            onChange={setSelectedTag}
            placeholder="Filter by tags"
            options={TAGS.map((tag) => ({
              label: tag,
              value: tag,
            }))}
            canUnselect
          />
          <label className={cn(buttonVariants({ variant: "outline" }), "gap-2 mt-auto cursor-pointer")}>
            <Checkbox checked={hideUsed} onCheckedChange={(_checked: boolean) => setHideUsed(_checked)} />
            Hide Used
          </label>
        </div>

        <div className="flex flex-wrap gap-4 ml-auto justify-end items-center whitespace-nowrap">
          <div className="flex md:flex-col gap-2 md:gap-0">
            <p>
              Selected Questions: <strong>{selectedQuestions?.length || 0}</strong>
            </p>
            <p>
              Total Marks: <strong>{getTotalMarks(selectedQuestions)}</strong>
            </p>
          </div>
          <div className="flex gap-2">
            <SavePaperButton
              id={defaultPaper?._id}
              defaultTitle={defaultPaper?.title}
              defaultAuthor={defaultPaper?.author || author}
              questions={selectedQuestions}
            />
            <PreviewButton
              questions={selectedQuestions}
              onPrint={() => updateUsage(selectedQuestions)}
              defaultTwoColumn={twoColumn}
              onQuestionRemove={(q) => setSelectedQuestions((prev) => prev.filter((ques) => ques._id !== q._id))}
              editable
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
                <PaperFrame questions={selectedQuestions} twoColumn={twoColumn} course={course} subject={subject} />
              </PrintContent>
            </Print>
          </div>
        </div>
      </div>

      <div className="h-fit flex-grow overflow-y-scroll flex border-t border-slate-200">
        <div className="hidden md:block md:w-[200px] lg:w-[300px] h-full sticky top-0">
          <div className="h-[52px] px-4 border border-slate-200 text-sm font-medium flex items-center ">CHAPTERS</div>
          <Input
            placeholder={"Search Chapter"}
            value={chapterSearch}
            onChange={(e) => setChapterSearch(e.target.value)}
          />
          <ol className="h-full max-h-[100vh] list-decimal flex flex-col overflow-scroll pt-4 pb-[200px]">
            {chaptersLoading ? (
              <>
                <Skeleton className="h-[30px] mx-4 my-1" />
                <Skeleton className="h-[30px] mx-4 my-1" />
                <Skeleton className="h-[30px] mx-4 my-1" />
                <Skeleton className="h-[30px] mx-4 my-1" />
                <Skeleton className="h-[30px] mx-4 my-1" />
              </>
            ) : !chapterToShow || chapterToShow?.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full py-12 px-4 text-slate-400">
                <InboxIcon className="w-[100px] h-[100px]" strokeWidth={1.4} />
                <p className="text-lg">No Chapter Found!</p>
              </div>
            ) : (
              chapterToShow?.map((q: TChapter, index: number) => (
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
              </SheetContent>
            </Sheet>
            <p className="whitespace-nowrap">QUESTIONS {totalQuestions ? `(${totalQuestions})` : ""}</p>
            {questions?.length > 0 && (
              <Button
                size={"sm"}
                variant={allSelected ? "default" : "outline"}
                className="border"
                onClick={() => {
                  if (allSelected) {
                    setSelectedQuestions(removeElementsById(selectedQuestions, questions));
                  } else {
                    setSelectedQuestions(getUniqueElementsById([...selectedQuestions, ...questions]));
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
                  setSelectedQuestions((prev) =>
                    getUniqueElementsById([...prev, ...getRandomItems(questions, random)])
                  );
                }}
              />
            )}
            <Button size={"sm"} variant={"outline"} onClick={refresh}>
              <RefreshCcw className="w-4 h-4" />
            </Button>

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
            <ol className={cn("border-l p-4 grid gap-4", twoColumn && "grid-cols-2")}>
              <Skeleton className="w-full h-[300px]" />
              <Skeleton className="w-full h-[300px]" />
              <Skeleton className="w-full h-[300px]" />
              <Skeleton className="w-full h-[300px]" />
              <Skeleton className="w-full h-[300px]" />
            </ol>
          ) : (
            <ol className={cn("border-l p-2 md:p-4 max-w-full", twoColumn && "grid grid-cols-2")}>
              {!questions || questions?.length == 0 ? (
                <div className="col-span-2 flex flex-col items-center justify-center w-full py-12 px-4 text-slate-400">
                  <InboxIcon className="w-[100px] h-[100px]" strokeWidth={1.4} />
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
                          checked={!!selectedQuestions.find((item) => item._id === q._id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedQuestions([q, ...selectedQuestions]);
                            } else {
                              let updatedList = selectedQuestions;
                              updatedList = updatedList.filter((ques) => ques._id != q._id);
                              setSelectedQuestions(updatedList);
                            }
                          }}
                        />
                        <TimesUsed count={q.timesUsed} />
                        <EditMarkdownSheet
                          text={q.text}
                          onSave={(text) => {
                            updateQuestion({
                              id: q._id,
                              text: text,
                            });
                          }}
                        />
                        <AddTagSheet questionId={q._id} tags={q.tags} />
                      </div>
                    </div>
                    <span className="pt-[10px] px-2">{lastIndex + index + 1}. </span>
                    <div>
                      <Markdown text={q.text ?? ""} />
                      <div className="flex gap-2 items-start [&_#preview]:!py-0">
                        <strong>
                          Ans:
                          <EditMarkdownSheet
                            text={q.ans}
                            onSave={(text) => {
                              updateQuestion({
                                id: q._id,
                                ans: text,
                              });
                            }}
                          />
                        </strong>{" "}
                        <Markdown text={q.ans || ""} />
                      </div>
                    </div>
                    <span className="pt-[10px] px-2 font-medium ml-auto">[{q.mark}]</span>
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
