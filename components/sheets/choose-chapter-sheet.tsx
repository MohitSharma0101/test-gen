"use client";

import { useState } from "react";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import SelectCompact from "@/components/ui/select-compact";
import { useCourses } from "@/hooks/useCourses";
import useBooks from "@/hooks/useBooks";
import useChapters from "@/hooks/useChapters";

export type TChapterChoice = { course?: string; subject?: string; bookId?: string; chapterId?: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected place (e.g. the request's own chapter). Read on open. */
  initial?: TChapterChoice;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: (chapterId: string) => Promise<void>;
};

/** Course → Subject → Book → Chapter, then one button that acts on the chosen chapter. */
export function ChooseChapterSheet({ open, onOpenChange, ...rest }: Props) {
  return (
    <ResponsiveDrawer open={open} onOpenChange={onOpenChange} title={rest.title} description={rest.description}>
      {/* Mounted only while open so the selects start from `initial` every time */}
      {open && <Body {...rest} />}
    </ResponsiveDrawer>
  );
}

function Body({ initial, confirmLabel, onConfirm }: Omit<Props, "open" | "onOpenChange" | "title" | "description">) {
  const { courses, subjects, course, subject, setCourse, setSubject } = useCourses({ defaultCourse: initial?.course, defaultSubject: initial?.subject });
  const [bookId, setBookId] = useState(initial?.bookId);
  const [chapterId, setChapterId] = useState(initial?.chapterId);
  const [busy, setBusy] = useState(false);
  const { books, loading: booksLoading } = useBooks(subject, course);
  const { chapters, loading: chaptersLoading } = useChapters(subject, course, bookId);

  const confirm = async () => {
    if (!chapterId || busy) return;
    setBusy(true);
    try {
      await onConfirm(chapterId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-2">
        <SelectCompact label="Course" options={courses.map((c) => ({ label: c, value: c }))} value={course} onChange={(v) => { setCourse(v); setBookId(undefined); setChapterId(undefined); }} />
        <SelectCompact label="Subject" options={(subjects ?? []).map((s) => ({ label: s, value: s }))} value={subject} onChange={(v) => { setSubject(v); setBookId(undefined); setChapterId(undefined); }} />
        <SelectCompact label="Book" placeholder="Choose" loading={booksLoading} options={books.map((b) => ({ label: b.title, value: b._id }))} value={bookId} onChange={(v) => { setBookId(v); setChapterId(undefined); }} />
        <SelectCompact label="Chapter" placeholder="Choose" loading={chaptersLoading} disabled={!bookId} options={(chapters ?? []).map((c) => ({ label: c.title, value: c._id }))} value={chapterId} onChange={setChapterId} />
      </div>
      <Button variant="brand" className="h-11 w-full gap-2" disabled={!chapterId || busy} onClick={confirm}>
        {busy ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
        {confirmLabel}
      </Button>
    </div>
  );
}
