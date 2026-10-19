"use client";

import SelectCompact from "@/components/ui/select-compact";
import { MARKS } from "@/data/const";
import React, { useState } from "react";
import useChapters from "@/hooks/useChapters";
import type { TChapter } from "@/models/Chapter";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Loader2Icon } from "lucide-react";
import useBooks from "@/hooks/useBooks";
import { Print, PrintContent, PrintTrigger } from "@/components/ui/print";
import PaperFrame from "@/components/frames/paper-frame";
import type { TQuestion } from "@/models/Question";
import PreviewButton from "@/components/ui/preview-button";
import { TAGS } from "@/components/sheets/add-tag-sheet";
import { useCourses } from "@/hooks/useCourses";
import GenerateVariantsSheet from "@/components/sheets/generate-variants-sheet";

type Props = {
  onUpload?: (chapter: string, marks: string, tags?: string[]) => Promise<void>;
  questions: TQuestion[];
  twoColumn?: boolean;
};

const UploadHeader = ({ questions, onUpload, twoColumn }: Props) => {
  const { course, subject, setCourse, setSubject, courses, subjects } = useCourses();
  const [book, setBook] = useState("");
  const { books, loading: booksLoading } = useBooks(subject, course);
  const { chapters, loading: chaptersLoading } = useChapters(subject, course, book);
  const [chapter, setChapter] = useState("");
  const [marks, setMarks] = useState("1");
  const [loading, setLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState("");

  return (
    <div className="px-4 sm:px-6 py-3 flex flex-col lg:flex-row gap-4 lg:gap-8 lg:items-center">
      {/* Phones: two columns, long pickers full width. Wider screens: one wrapping row */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4 sm:items-center flex-grow">
        <SelectCompact
          label="Class"
          placeholder="Select a class"
          className="min-w-0 sm:w-[300px]"
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
          className="min-w-0 sm:w-[300px]"
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
          className="col-span-2 min-w-0 sm:w-[300px]"
          value={book}
          onChange={setBook}
          options={books.map((b) => ({
            label: b.title,
            value: b._id,
          }))}
          loading={booksLoading}
        />
        <SelectCompact
          label="Chapter"
          placeholder="Select a chapter"
          className="col-span-2 min-w-0 sm:w-[300px]"
          value={chapter}
          onChange={setChapter}
          emptyState="Select a Book first"
          options={
            chapters?.map((c: TChapter) => ({
              label: c.title,
              value: c._id,
            })) ?? []
          }
          loading={chaptersLoading}
        />
        <SelectCompact
          label="Marks"
          placeholder="Select marks"
          className="min-w-0 sm:w-[140px]"
          value={marks}
          onChange={setMarks}
          options={
            MARKS?.map((mark) => ({
              label: mark.toString(),
              value: mark.toString(),
            })) ?? []
          }
        />
        <SelectCompact
          label="Tags"
          className="min-w-0 sm:w-fit"
          value={selectedTag}
          onChange={setSelectedTag}
          placeholder="Select tag"
          options={TAGS.map((tag) => ({
            label: tag,
            value: tag,
          }))}
          canUnselect
        />
      </div>
      {/* Phones: totals, then Generate / Preview / Print sharing a row, then a full-width Upload */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 lg:ml-auto lg:flex-nowrap lg:whitespace-nowrap max-sm:[&>button:not([data-upload])]:min-w-[96px] max-sm:[&>button:not([data-upload])]:flex-1 max-sm:[&>button:not([data-upload])]:px-2">
        <GenerateVariantsSheet
          chapter={chapter}
          marks={marks}
          tags={selectedTag ? [selectedTag] : []}
        />
        {/* One line above the buttons on phones, stacked beside them on wide screens */}
        <p className="order-first flex w-full flex-wrap gap-x-3 text-sm sm:order-none lg:block lg:w-auto lg:text-base">
          <span className="whitespace-nowrap">
            Total Questions: <strong>{questions?.length || 0}</strong>
          </span>
          <br className="hidden lg:block" />
          <span className="whitespace-nowrap">
            Total Ans: <strong>{questions?.map((q) => q.ans)?.filter(Boolean)?.length || 0}</strong>
          </span>
          <br className="hidden lg:block" />
          <span className="whitespace-nowrap">
            Total Marks: <strong>{questions?.length * Number(marks)}</strong>
          </span>
        </p>
        <Button
          data-upload
          className="order-last w-full sm:order-none sm:w-auto"
          disabled={questions.length === 0 || loading}
          onClick={async () => {
            if (chapter) {
              setLoading(true);
              await onUpload?.(chapter, marks, [selectedTag]);
              setLoading(false);
            } else {
              toast({
                title: "Please select a Class, Subject & Chapter to upload a question set.",
                variant: "destructive",
              });
            }
          }}
        >
          {loading && <Loader2Icon className="w-4 h-4 animate-spin mr-2" />}
          Upload Questions
        </Button>
        <PreviewButton questions={questions} defaultTwoColumn={twoColumn} />
        <Print>
          <PrintTrigger disabled={questions.length === 0 || loading} className="px-6">
            Print
          </PrintTrigger>
          <PrintContent>
            <PaperFrame
              questions={questions.map((q) => ({
                ...q,
                mark: Number(marks),
              }))}
              twoColumn={twoColumn}
              course={course}
              subject={subject}
            />
          </PrintContent>
        </Print>
      </div>
    </div>
  );
};

export default UploadHeader;
