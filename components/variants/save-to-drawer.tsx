"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import { Button } from "@/components/ui/button";
import SelectCompact from "@/components/ui/select-compact";
import { TAGS } from "@/components/sheets/add-tag-sheet";
import { MARKS } from "@/data/const";
import useBooks from "@/hooks/useBooks";
import useChapters from "@/hooks/useChapters";
import { useCourses } from "@/hooks/useCourses";
import type { TChapter } from "@/models/Chapter";
import { useSaveTargetStore, type TSaveTarget } from "@/stores/saveTargetStore";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  uploading: boolean;
  onConfirm: (target: TSaveTarget) => void;
};

// Mounted only while the drawer is open, so the pickers start from whatever
// was chosen last time (the store) every time it opens.
const SaveToFields = ({ count, uploading, onConfirm }: Omit<Props, "open" | "onOpenChange">) => {
  const saved = useSaveTargetStore.getState();
  const setTarget = useSaveTargetStore((s) => s.setTarget);

  const { course, subject, setCourse, setSubject, courses, subjects } = useCourses({
    defaultCourse: saved.course || undefined,
    defaultSubject: saved.subject || undefined,
  });
  const [book, setBook] = useState(saved.book);
  const [chapter, setChapter] = useState(saved.chapter);
  const [marks, setMarks] = useState(saved.marks || "1");
  const [tag, setTag] = useState(saved.tag);
  const { books, loading: booksLoading } = useBooks(subject, course);
  const { chapters, loading: chaptersLoading } = useChapters(subject, course, book);

  // Every change is remembered at once, so closing without uploading keeps it
  useEffect(() => {
    setTarget({ course, subject, book, chapter, marks, tag });
  }, [course, subject, book, chapter, marks, tag, setTarget]);

  // A new class, subject or book means the old book/chapter no longer apply.
  // Only on the person's own change: the remembered choice is never cleared
  // by the lists still loading when the drawer opens.
  const pickCourse = (c: string) => {
    setCourse(c);
    setBook("");
    setChapter("");
  };
  const pickSubject = (s: string) => {
    setSubject(s);
    setBook("");
    setChapter("");
  };
  const pickBook = (b: string) => {
    setBook(b);
    setChapter("");
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 p-4">
        <SelectCompact
          label="Class"
          placeholder="Select a class"
          className="min-w-0"
          value={course}
          onChange={pickCourse}
          options={courses.map((c) => ({ label: c, value: c }))}
        />
        <SelectCompact
          label="Subject"
          placeholder="Select a subject"
          className="min-w-0"
          emptyState="Select a Class first"
          value={subject}
          onChange={pickSubject}
          options={(subjects ?? []).map((s) => ({ label: s, value: s }))}
        />
        <SelectCompact
          label="Book"
          placeholder="Select a book"
          className="col-span-2 min-w-0"
          value={book}
          onChange={pickBook}
          options={books.map((b) => ({ label: b.title, value: b._id }))}
          loading={booksLoading}
        />
        <SelectCompact
          label="Chapter"
          placeholder="Select a chapter"
          className="col-span-2 min-w-0"
          value={chapter}
          onChange={setChapter}
          emptyState="Select a Book first"
          options={chapters?.map((c: TChapter) => ({ label: c.title, value: c._id })) ?? []}
          loading={chaptersLoading}
        />
        <SelectCompact
          label="Marks"
          placeholder="Select marks"
          className="min-w-0"
          value={marks}
          onChange={setMarks}
          options={MARKS.map((m) => ({ label: m.toString(), value: m.toString() }))}
        />
        <SelectCompact
          label="Tag"
          placeholder="Select tag"
          className="min-w-0"
          value={tag}
          onChange={setTag}
          options={TAGS.map((t) => ({ label: t, value: t }))}
          canUnselect
        />
      </div>
      {/* Inside the fields so the button reads the picks directly; sticky so it
          stays reachable if the drawer has to scroll */}
      <div className="sticky bottom-0 space-y-2 border-t bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        {!chapter && <p className="text-center text-xs text-muted-foreground">Pick a chapter to upload</p>}
        <Button
          onClick={() => onConfirm({ course, subject, book, chapter, marks, tag })}
          variant="brand"
          disabled={!chapter || uploading || count === 0}
          className="h-11 w-full gap-2"
        >
          {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
          Upload {count} question{count === 1 ? "" : "s"}
        </Button>
      </div>
    </>
  );
};

// Asked for at upload time instead of sitting on the page: a bottom drawer on
// phones, a floating right-hand panel on wider screens.
export const SaveToDrawer = ({ open, onOpenChange, ...rest }: Props) => (
  <ResponsiveDrawer
    open={open}
    onOpenChange={onOpenChange}
    title="Save to"
    description="Your last choice is kept, so usually you can just upload."
  >
    {open && <SaveToFields {...rest} />}
  </ResponsiveDrawer>
);
