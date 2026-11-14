"use client";

import React, { useEffect, useState } from "react";
import { LibraryIcon, Loader2Icon, PenLineIcon, PlusIcon, Trash2Icon } from "lucide-react";
import EditTitleSheet from "@/components/sheets/edit-title-sheet";
import { Button } from "@/components/ui/button";
import DeleteButton from "@/components/ui/delete-button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import SelectCompact from "@/components/ui/select-compact";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state-message";
import { ROUTE_GROUPS } from "@/data/routes";
import useBooks from "@/hooks/useBooks";
import { useCourses } from "@/hooks/useCourses";
import type { TBook } from "@/models/Book";
import { courseLabel } from "@/lib/utils";

const TONE = ROUTE_GROUPS.bank.tile;

const BooksPage = () => {
  const { course, subject, setCourse, setSubject, courses, subjects } = useCourses();
  const { books, loading, error, refresh, addBook, deleteBook, updateBook } = useBooks(subject, course);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TBook>();

  // A subject from the previous class may not exist in the new one
  useEffect(() => {
    const list = subjects ?? [];
    if (!list.includes(subject)) setSubject(list[0] ?? "");
  }, [subjects, subject, setSubject]);

  const onAdd = async () => {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    // Cleared only when it was saved
    if (await addBook(newTitle.trim())) setNewTitle("");
    setAdding(false);
  };

  const list = () => {
    if (loading && books.length === 0) {
      return (
        <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading books">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      );
    }
    if (error && books.length === 0) return <ErrorState className="py-8" message="Couldn't load books." onRetry={refresh} />;
    if (books.length === 0) {
      return (
        <EmptyState
          className="py-10"
          tone={TONE}
          icon={<LibraryIcon />}
          title="No books yet"
          description={`Add the first ${subject} book for ${courseLabel(course)} above.`}
        />
      );
    }
    return (
      <ol className="divide-y">
        {books.map((book, index) => (
          <li key={book._id} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted-foreground">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{book.title || "Untitled"}</span>
            <Button variant="ghost" className="size-10 p-0" aria-label={`Rename ${book.title}`} onClick={() => setEditing(book)}>
              <PenLineIcon className="size-4" />
            </Button>
            <DeleteButton
              variant="ghost"
              className="size-10 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
              title={`Delete "${book.title}"?`}
              description="This can't be undone."
              onDelete={(close) => {
                close();
                deleteBook(book._id);
              }}
            >
              <Trash2Icon className="size-4" aria-label={`Delete ${book.title}`} />
            </DeleteButton>
          </li>
        ))}
      </ol>
    );
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 pb-12 pt-5 sm:px-6">
      <PageHeader icon={<LibraryIcon />} tone={TONE} title="Books" description="Books for each class and subject" />

      <div className="grid grid-cols-2 gap-2">
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
            aria-label="New book title"
            placeholder="New book title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={!course || !subject}
            className="h-11 text-base sm:text-sm"
          />
          <Button type="submit" variant="brand" className="h-11 shrink-0 gap-1.5" disabled={!newTitle.trim() || adding || !course || !subject}>
            {adding ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
            Add
          </Button>
        </form>
        {list()}
      </section>

      {editing && (
        <EditTitleSheet
          key={editing._id}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(undefined)}
          heading="Rename book"
          label="Book title"
          defaultTitle={editing.title}
          onSave={(title) => updateBook(editing._id, title)}
        />
      )}
    </main>
  );
};

export default BooksPage;
