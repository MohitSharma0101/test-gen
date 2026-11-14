"use client";

import React, { useEffect, useState } from "react";
import { ArrowRightToLineIcon, Loader2Icon } from "lucide-react";
import { Button } from "../ui/button";
import SelectCompact from "../ui/select-compact";
import { ResponsiveDrawer } from "../ui/responsive-drawer";
import { useToast } from "../ui/use-toast";
import useBooks from "@/hooks/useBooks";
import { useCourses } from "@/hooks/useCourses";
import { TChapter } from "@/models/Chapter";
import { moveChapter } from "@/service/core.service";
import { courseLabel } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapters: TChapter[];
  // Start on the class/subject the page is showing
  defaultCourse?: string;
  defaultSubject?: string;
  // The book they're in now: not offered as a target
  currentBook?: string;
  onSuccess?: () => void;
};

// Move the selected chapters (and their questions) to another book
const MoveChaptersDailog = ({ open, onOpenChange, chapters, defaultCourse, defaultSubject, currentBook, onSuccess }: Props) => {
  const { course, subject, setCourse, setSubject, courses, subjects } = useCourses({ defaultCourse, defaultSubject });
  const { books, loading: booksLoading } = useBooks(subject, course);
  const [book, setBook] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const list = subjects ?? [];
    if (!list.includes(subject)) setSubject(list[0] ?? "");
  }, [subjects, subject, setSubject]);

  const targets = books.filter((b) => b._id !== currentBook);
  // A book from the previous class/subject is no longer a valid target
  useEffect(() => {
    if (book && !targets.some((b) => b._id === book)) setBook("");
  }, [targets, book]);

  const onSubmit = async () => {
    if (!book || loading || chapters.length === 0) return;
    setLoading(true);
    try {
      await moveChapter(
        chapters.map((c) => c._id),
        book
      );
      toast({ variant: "success", title: `${chapters.length} chapter${chapters.length === 1 ? "" : "s"} moved` });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't move the chapters", description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={`Move ${chapters.length} chapter${chapters.length === 1 ? "" : "s"}`}
      description="Their questions move with them."
      footer={
        <Button variant="brand" disabled={!book || loading} onClick={onSubmit} className="h-11 w-full gap-2">
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : <ArrowRightToLineIcon className="size-4" />}
          Move here
        </Button>
      }
    >
      <div className="space-y-4 p-4">
        <ul className="flex flex-wrap gap-1.5">
          {chapters.map((c) => (
            <li key={c._id} className="max-w-full truncate rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
              {c.title}
            </li>
          ))}
        </ul>
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
            label="To book"
            placeholder="Select a book"
            value={book}
            onChange={setBook}
            options={targets.map((b) => ({ label: b.title, value: b._id }))}
            emptyState="No other books for this class and subject"
            loading={booksLoading}
            className="col-span-2 min-w-0"
          />
        </div>
      </div>
    </ResponsiveDrawer>
  );
};

export default MoveChaptersDailog;
