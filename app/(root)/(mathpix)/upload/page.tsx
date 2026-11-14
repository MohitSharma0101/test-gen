"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Columns2Icon, EyeIcon, FileCheckIcon, FileQuestionIcon, FileStackIcon, FileUpIcon, Loader2Icon, RectangleVerticalIcon, SparklesIcon } from "lucide-react";
import { TAGS } from "@/components/sheets/add-tag-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import Markdown from "@/components/ui/markdown";
import { PageHeader } from "@/components/ui/page-header";
import PreviewButtonV2 from "@/components/ui/preview-button-v2";
import SelectCompact from "@/components/ui/select-compact";
import { EmptyState } from "@/components/ui/state-message";
import { toast } from "@/components/ui/use-toast";
import { MARKS } from "@/data/const";
import { ROUTE_GROUPS } from "@/data/routes";
import useBooks from "@/hooks/useBooks";
import useChapters from "@/hooks/useChapters";
import { useCourses } from "@/hooks/useCourses";
import { extractItemsArray } from "@/lib/mdUtils";
import { cn, courseLabel } from "@/lib/utils";
import type { TQuestion } from "@/models/Question";
import { uploadQuestionsInBatch } from "@/service/core.service";
import UploadInput from "./upload-input";

const TONE = ROUTE_GROUPS.bank.tile;

// Which file(s) the questions come from: the last one touched wins, as before
type TSource = "separate" | "combined";

const Section = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
  <section className={cn("min-w-0 rounded-2xl border bg-card p-4 shadow-sm", className)}>
    <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
    {children}
  </section>
);

const UploadPage = () => {
  const [questionContent, setQuestionContent] = useState("");
  const [ansContent, setAnsContent] = useState("");
  const [questionAnsContent, setQuestionAnsContent] = useState("");
  const [source, setSource] = useState<TSource>("separate");
  const [twoColumn, setTwoColumn] = useState(true);
  const [uploading, setUploading] = useState(false);

  const { course, subject, setCourse, setSubject, courses, subjects } = useCourses();
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [marks, setMarks] = useState("1");
  const [tag, setTag] = useState("");
  const { books, loading: booksLoading } = useBooks(subject, course);
  const { chapters, loading: chaptersLoading } = useChapters(subject, course, book);

  // Each pick depends on the one before: clear what no longer belongs
  useEffect(() => {
    const list = subjects ?? [];
    if (!list.includes(subject)) setSubject(list[0] ?? "");
  }, [subjects, subject, setSubject]);
  useEffect(() => {
    if (book && !booksLoading && !books.some((b) => b._id === book)) setBook("");
  }, [books, book, booksLoading]);
  useEffect(() => {
    if (chapter && !chaptersLoading && !(chapters ?? []).some((c) => c._id === chapter)) setChapter("");
  }, [chapters, chapter, chaptersLoading]);

  const qItems = useMemo(() => extractItemsArray(questionContent), [questionContent]);
  const aItems = useMemo(() => extractItemsArray(ansContent), [ansContent]);
  const qaItems = useMemo(() => extractItemsArray(questionAnsContent), [questionAnsContent]);

  // Built from the files every time, so the order they're added in no longer
  // matters (answers added before questions used to be dropped)
  const questions = useMemo<TQuestion[]>(() => {
    if (source === "combined") {
      const list: TQuestion[] = [];
      for (let i = 0; i < qaItems.length; i += 2) list.push({ text: qaItems[i], ans: qaItems[i + 1] });
      return list;
    }
    return qItems.map((text, i) => ({ text, ans: aItems[i] }));
  }, [source, qItems, aItems, qaItems]);

  const answered = questions.filter((q) => q.ans).length;
  const mark = Number(marks) || 0;
  const withMarks = useMemo(() => questions.map((q) => ({ ...q, mark })), [questions, mark]);
  const mismatch = source === "separate" && qItems.length > 0 && aItems.length > 0 && qItems.length !== aItems.length;

  const missing = !questions.length ? "Add a question file" : !chapter ? "Pick a chapter to save into" : "";

  const onUpload = async () => {
    if (missing || uploading) return;
    setUploading(true);
    try {
      await uploadQuestionsInBatch(questions.map((q) => ({ ...q, chapter, mark, tags: [tag] })));
      toast({ title: `${questions.length} question${questions.length === 1 ? "" : "s"} uploaded`, variant: "success" });
      setQuestionContent("");
      setAnsContent("");
      setQuestionAnsContent("");
    } catch (err) {
      // Files and picks are kept so it can be retried
      toast({ title: "Upload failed", description: (err as Error)?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const variantsHref = `/variants?${new URLSearchParams({ course, subject, book, chapter, marks, tag }).toString()}`;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-40 pt-5 sm:px-6 sm:pb-28">
      <PageHeader
        icon={<FileUpIcon />}
        tone={TONE}
        title="Upload questions"
        description="Add questions to the bank from a Mathpix .md file"
        actions={
          <Link href={variantsHref} className={cn(buttonVariants({ variant: "outline" }), "gap-2")} aria-label="Generate variants">
            <SparklesIcon className="size-4" />
            <span className="hidden sm:inline">Generate variants</span>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Section title="1 · Files">
          <div className="space-y-2">
            <UploadInput
              icon={<FileQuestionIcon />}
              label="Questions"
              hint="Numbered questions: 1. … 2. …"
              text={questionContent}
              count={qItems.length}
              active={source === "separate"}
              onChange={(t) => {
                setQuestionContent(t);
                setSource("separate");
              }}
            />
            <UploadInput
              icon={<FileCheckIcon />}
              label="Answers"
              hint="Optional, numbered in the same order"
              text={ansContent}
              count={aItems.length}
              active={source === "separate"}
              onChange={(t) => {
                setAnsContent(t);
                setSource("separate");
              }}
            />
            <div className="flex items-center gap-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>
            <UploadInput
              icon={<FileStackIcon />}
              label="Questions & answers in one file"
              hint="Question, then its answer, as numbered items"
              text={questionAnsContent}
              count={qaItems.length}
              active={source === "combined"}
              onChange={(t) => {
                setQuestionAnsContent(t);
                setSource("combined");
              }}
            />
          </div>
          {mismatch && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              {qItems.length} questions but {aItems.length} answers: check that they line up in the preview.
            </p>
          )}
        </Section>

        <Section title="2 · Save into">
          <div className="grid grid-cols-2 gap-3">
            <SelectCompact
              label="Class"
              placeholder="Select a class"
              value={course}
              onChange={setCourse}
              options={courses.map((c) => ({ label: courseLabel(c), value: c }))}
              className="min-w-0"
            />
            <SelectCompact
              label="Subject"
              placeholder="Select a subject"
              value={subject}
              onChange={setSubject}
              options={(subjects ?? []).map((s) => ({ label: s, value: s }))}
              className="min-w-0"
            />
            <SelectCompact
              label="Book"
              placeholder="Select a book"
              value={book}
              onChange={setBook}
              options={books.map((b) => ({ label: b.title, value: b._id }))}
              emptyState="No books for this subject"
              loading={booksLoading}
              className="col-span-2 min-w-0"
            />
            <SelectCompact
              label="Chapter"
              placeholder={book ? "Select a chapter" : "Select a book first"}
              value={chapter}
              onChange={setChapter}
              options={(chapters ?? []).map((c) => ({ label: c.title, value: c._id }))}
              emptyState={book ? "No chapters in this book" : "Select a book first"}
              loading={chaptersLoading}
              disabled={!book}
              className="col-span-2 min-w-0"
            />
            <SelectCompact
              label="Marks each"
              placeholder="Marks"
              value={marks}
              onChange={setMarks}
              options={MARKS.map((m) => ({ label: String(m), value: String(m) }))}
              className="min-w-0"
            />
            <SelectCompact
              label="Tag"
              placeholder="No tag"
              value={tag}
              onChange={setTag}
              options={TAGS.map((t) => ({ label: t, value: t }))}
              canUnselect
              className="min-w-0"
            />
          </div>
        </Section>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">3 · Check</h2>
          {questions.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {questions.length} questions · {answered} with answers
            </span>
          )}
          {questions.length > 0 && (
            <div role="group" aria-label="Preview layout" className="ml-auto hidden rounded-lg border bg-muted p-0.5 md:flex">
              {[
                { two: false, label: "1 column", Icon: RectangleVerticalIcon },
                { two: true, label: "2 columns", Icon: Columns2Icon },
              ].map(({ two, label, Icon }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={twoColumn === two}
                  onClick={() => setTwoColumn(two)}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                    twoColumn === two && "bg-card text-foreground shadow-sm"
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {questions.length === 0 ? (
          <EmptyState className="py-12" tone={TONE} icon={<EyeIcon />} title="Nothing to check yet" description="Add a question file and every question shows here with its answer." />
        ) : (
          <ol
            id="paper"
            className={cn(
              "w-full list-decimal bg-white pb-4 pl-10 pr-4 pt-3 text-black md:pl-12 [&_#preview]:!pt-0 [&_li]:break-words",
              // Two columns are too narrow on a phone
              twoColumn && "md:columns-2 md:gap-10"
            )}
          >
            {questions.map((q, index) => (
              <li key={index} className="break-inside-avoid py-1">
                <Markdown text={q.text || ""} />
                <div className="flex items-start gap-1">
                  <strong>Ans:</strong>
                  {q.ans ? <Markdown text={q.ans} /> : <span className="text-sm font-medium text-amber-700">No answer</span>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Upload bar: the totals and the one main action, always in reach */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
          <p className="min-w-0 flex-1 whitespace-nowrap text-sm">
            <span className="font-bold tabular-nums">{questions.length}</span> questions ·{" "}
            <span className="font-bold tabular-nums">{questions.length * mark}</span> marks
            {missing && <span className="block truncate text-xs text-muted-foreground">{missing}</span>}
          </p>
          <PreviewButtonV2 questions={withMarks} defaultTwoColumn={twoColumn} className="h-11" />
          <Button variant="brand" className="h-11 gap-2 px-5" onClick={onUpload} disabled={Boolean(missing) || uploading}>
            {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <FileUpIcon className="size-4" />}
            Upload{questions.length ? ` ${questions.length}` : ""}
          </Button>
        </div>
      </div>
    </main>
  );
};

export default UploadPage;
