"use client";

import SelectCompact from "@/components/ui/select-compact";
import { COURSES, MARKS, SUBJECT_MAP } from "@/data/const";
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

type Props = {
  onUpload?: (chapter: string, marks: string, tags?: string[]) => Promise<void>;
  questions: TQuestion[];
  twoColumn?: boolean;
};

const UploadHeader = ({ questions, onUpload, twoColumn }: Props) => {
  const [course, setCourse] = useState(COURSES[0]);
  const [subject, setSubject] = useState("");
  const [book, setBook] = useState("");
  const { books, loading: booksLoading } = useBooks(subject, course);
  const { chapters, loading: chaptersLoading } = useChapters(
    subject,
    course,
    book
  );
  const [chapter, setChapter] = useState("");
  const [marks, setMarks] = useState("1");
  const [loading, setLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState("");

  return (
    <div className="px-6 py-3 flex flex-col lg:flex-row gap-8 items-center">
      <div className="flex flex-wrap gap-4 items-center flex-grow">
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
        <SelectCompact
          label="Chapter"
          placeholder="Select a chapter"
          className="w-[300px]"
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
          className="w-[140px]"
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
          className="w-fit"
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
      <div className="flex gap-4 ml-auto items-center whitespace-nowrap">
        <p>
          Total Questions: <strong>{questions?.length || 0}</strong>
          <br />
          Total Ans:{" "}
          <strong>
            {questions?.map((q) => q.ans)?.filter(Boolean)?.length || 0}
          </strong>
          <br />
          Total Marks: <strong>{questions?.length * Number(marks)}</strong>
        </p>
        <Button
          disabled={questions.length === 0 || loading}
          onClick={async () => {
            if (chapter) {
              setLoading(true);
              await onUpload?.(chapter, marks, [selectedTag]);
              setLoading(false);
            } else {
              toast({
                title:
                  "Please select a Class, Subject & Chapter to upload a question set.",
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
          <PrintTrigger
            disabled={questions.length === 0 || loading}
            className="px-6"
          >
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
