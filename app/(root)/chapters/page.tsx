"use client";

import React, { useEffect, useState } from "react";
import { ArrowRightToLineIcon, BookOpenTextIcon, Loader2Icon, PenLineIcon, PlusIcon, RefreshCwIcon, Trash2Icon, XIcon } from "lucide-react";
import EditTitleSheet from "@/components/sheets/edit-title-sheet";
import MoveChaptersDailog from "@/components/sheets/move-chapter-dailog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import DeleteButton from "@/components/ui/delete-button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import SelectCompact from "@/components/ui/select-compact";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import { ROUTE_GROUPS } from "@/data/routes";
import useBooks from "@/hooks/useBooks";
import useChapters from "@/hooks/useChapters";
import { useCourses } from "@/hooks/useCourses";
import { TChapter } from "@/models/Chapter";
import { cn, courseLabel } from "@/lib/utils";

const TONE = ROUTE_GROUPS.bank.tile;

const ChaptersPage = () => {
  const { course, subject, setCourse, setSubject, courses, subjects } = useCourses();
  const { books, loading: booksLoading } = useBooks(subject, course);
  const [book, setBook] = useState("");
  const { chapters: data, loading, error, addChapter, deleteChapter, updateChapter, refresh } = useChapters(subject, course, book);
  const chapters = data ?? [];
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<TChapter>();
  const [moving, setMoving] = useState(false);

  // A subject from the previous class may not exist in the new one
  useEffect(() => {
    const list = subjects ?? [];
    if (!list.includes(subject)) setSubject(list[0] ?? "");
  }, [subjects, subject, setSubject]);

  // Keep a valid book: the first one when the class/subject changes
  useEffect(() => {
    if (booksLoading) return;
    if (!books.some((b) => b._id === book)) setBook(books[0]?._id ?? "");
  }, [books, book, booksLoading]);

  // Selection belongs to one book
  useEffect(() => setSelectedIds([]), [book]);

  const selected = chapters.filter((c) => selectedIds.includes(c._id));
  const toggle = (id: string, on: boolean) => setSelectedIds((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)));

  const onAdd = async () => {
    if (!newTitle.trim() || !book || adding) return;
    setAdding(true);
    if (await addChapter(newTitle.trim(), book)) setNewTitle("");
    setAdding(false);
  };

  const list = () => {
    if (!booksLoading && books.length === 0) {
      return (
        <EmptyState
          className="py-10"
          tone={TONE}
          icon={<BookOpenTextIcon />}
          title="No books for this subject"
          description="Add a book on the Books page first."
        />
      );
    }
    if ((loading || booksLoading) && chapters.length === 0) {
      return (
        <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading chapters">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      );
    }
    if (error && chapters.length === 0) return <ErrorState className="py-8" message="Couldn't load chapters." onRetry={refresh} />;
    if (chapters.length === 0) {
      return <EmptyState className="py-10" tone={TONE} icon={<BookOpenTextIcon />} title="No chapters yet" description="Add the first chapter above." />;
    }
    return (
      <ol className="divide-y">
        {chapters.map((chapter, index) => {
          const id = `chapter-${chapter._id}`;
          const isSelected = selectedIds.includes(chapter._id);
          return (
            <li key={chapter._id} className={cn("flex min-h-14 items-center gap-2 py-1 pl-4 pr-2", isSelected && "bg-brand-soft/60")}>
              <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-2">
                <Checkbox id={id} checked={isSelected} onCheckedChange={(c) => toggle(chapter._id, c === true)} />
                <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{chapter.title || "Untitled"}</span>
              </label>
              <Button variant="ghost" className="size-10 shrink-0 p-0" aria-label={`Edit ${chapter.title}`} onClick={() => setEditing(chapter)}>
                <PenLineIcon className="size-4" />
              </Button>
              <DeleteButton
                variant="ghost"
                className="size-10 shrink-0 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                title={`Delete "${chapter.title}"?`}
                description="This also permanently deletes every question in this chapter. It can't be undone."
                onDelete={(close) => {
                  close();
                  deleteChapter(chapter._id);
                }}
              >
                <Trash2Icon className="size-4" aria-label={`Delete ${chapter.title}`} />
              </DeleteButton>
            </li>
          );
        })}
      </ol>
    );
  };

  return (
    <main className={cn("mx-auto w-full max-w-3xl space-y-4 px-4 pt-5 sm:px-6", selected.length ? "pb-28" : "pb-12")}>
      <PageHeader
        icon={<BookOpenTextIcon />}
        tone={TONE}
        title="Chapters"
        description={book && chapters.length ? `${chapters.length} chapter${chapters.length === 1 ? "" : "s"} in this book` : "Chapters in each book"}
        actions={
          <Button variant="outline" className="size-10 p-0" aria-label="Refresh chapters" onClick={() => refresh()} disabled={!book}>
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-[10rem_12rem_1fr]">
        <SelectCompact
          placeholder="Class"
          value={course}
          onChange={setCourse}
          options={courses.map((c) => ({ label: courseLabel(c), value: c }))}
          className="min-w-0"
        />
        <SelectCompact
          placeholder="Subject"
          value={subject}
          onChange={setSubject}
          options={(subjects ?? []).map((s) => ({ label: s, value: s }))}
          className="min-w-0"
        />
        <SelectCompact
          placeholder="Book"
          value={book}
          onChange={setBook}
          options={books.map((b) => ({ label: b.title, value: b._id }))}
          emptyState="No books for this subject"
          loading={booksLoading}
          className="col-span-2 min-w-0 md:col-span-1"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <form
          className="flex gap-2 border-b p-3"
          onSubmit={(e) => {
            e.preventDefault();
            onAdd();
          }}
        >
          <Input
            aria-label="New chapter title"
            placeholder="New chapter title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={!book}
            className="h-11 text-base sm:text-sm"
          />
          <Button type="submit" variant="brand" className="h-11 shrink-0 gap-1.5" disabled={!newTitle.trim() || adding || !book}>
            {adding ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
            Add
          </Button>
        </form>
        {list()}
      </section>

      {/* Selection bar: appears once chapters are ticked */}
      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur animate-in slide-in-from-bottom-4 motion-reduce:animate-none">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <Button variant="ghost" className="size-10 p-0" aria-label="Clear selection" onClick={() => setSelectedIds([])}>
              <XIcon className="size-4" />
            </Button>
            <span className="flex-1 text-sm font-medium">{selected.length} selected</span>
            <Button variant="brand" className="h-11 gap-2" onClick={() => setMoving(true)}>
              <ArrowRightToLineIcon className="size-4" /> Move to book
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <EditTitleSheet
          key={editing._id}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(undefined)}
          heading="Edit chapter"
          label="Chapter title"
          defaultTitle={editing.title}
          defaultOrder={editing.order || chapters.findIndex((c) => c._id === editing._id) + 1}
          onSave={(title, order) => updateChapter(editing._id, title, order)}
        />
      )}
      {moving && (
        <MoveChaptersDailog
          open={moving}
          onOpenChange={setMoving}
          chapters={selected}
          defaultCourse={course}
          defaultSubject={subject}
          currentBook={book}
          onSuccess={() => {
            setSelectedIds([]);
            refresh();
          }}
        />
      )}
    </main>
  );
};

export default ChaptersPage;
