"use client";

import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";
import type { TBook } from "@/models/Book";
import type { TChapter } from "@/models/Chapter";
import { ChevronRightIcon, InboxIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Props = {
  books: TBook[];
  chapters: TChapter[];
  booksLoading?: boolean;
  chaptersLoading?: boolean;
  selected: string[];
  onChange: (chapterIds: string[]) => void;
  // Candidates per chapter under the current filters, when known
  availableByChapter?: Map<string, number>;
  className?: string;
};

// Books and their chapters as one tree, rather than a book dropdown and a
// separate chapter list: the chapters of every book are reachable without
// first committing to a set of books, and what is ticked stays visible.
const ChapterPicker = ({
  books,
  chapters,
  booksLoading,
  chaptersLoading,
  selected,
  onChange,
  availableByChapter,
  className,
}: Props) => {
  const [search, setSearch] = useState("");
  const [openBooks, setOpenBooks] = useState<string[]>([]);

  const chaptersByBook = useMemo(() => {
    const map = new Map<string, TChapter[]>();
    chapters.forEach((c) => {
      const key = String(c.book);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return map;
  }, [chapters]);

  const term = search.trim().toLowerCase();

  // Searching reaches into every book, so a chapter is findable without
  // knowing which book holds it. Matching books open themselves.
  const visible = useMemo(
    () =>
      books
        .map((book) => {
          const all = chaptersByBook.get(book._id) ?? [];
          const matches = term
            ? all.filter((c) => c.title.toLowerCase().includes(term))
            : all;
          return { book, chapters: matches, total: all.length };
        })
        .filter((row) => (term ? row.chapters.length > 0 : true)),
    [books, chaptersByBook, term]
  );

  useEffect(() => {
    if (term) setOpenBooks(visible.map((v) => v.book._id));
  }, [term, visible.length]);

  // Opening on the first book saves a click in the common case of one book,
  // and shows at a glance that a book opens. Re-runs when the set of books
  // changes, i.e. when the class or subject does.
  const bookKey = books.map((b) => b._id).join(",");
  useEffect(() => {
    setOpenBooks(books.length ? [books[0]._id] : []);
  }, [bookKey]);

  const selectedSet = new Set(selected);

  const toggleBookOpen = (bookId: string) =>
    setOpenBooks((prev) =>
      prev.includes(bookId) ? prev.filter((b) => b !== bookId) : [...prev, bookId]
    );

  const setMany = (ids: string[], checked: boolean) => {
    const next = new Set(selected);
    ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
    onChange(Array.from(next));
  };

  const allVisibleIds = visible.flatMap((v) => v.chapters.map((c) => c._id));
  const allVisibleSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedSet.has(id));

  if (booksLoading) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-slate-400">
        <InboxIcon className="w-12 h-12" strokeWidth={1.4} />
        <p className="text-sm text-center">No book for this class and subject.</p>
      </div>
    );
  }

  return (
    // On a phone the panel is one scrolling column, so the tree flows at its
    // natural height; only the desktop split gives it a box to scroll inside.
    // flex-1 with min-h-0 in an auto-height column would collapse to nothing.
    <div className={cn("flex flex-col lg:min-h-0", className)}>
      <div className="p-3 pb-2 flex items-center gap-2 border-b border-slate-200">
        <div className="relative flex-1">
          <SearchIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search any chapter"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        {allVisibleIds.length > 0 && (
          <Button
            variant={allVisibleSelected ? "default" : "outline"}
            size="sm"
            className="h-9 shrink-0 text-xs"
            onClick={() => setMany(allVisibleIds, !allVisibleSelected)}
          >
            {allVisibleSelected ? "None" : "All"}
          </Button>
        )}
      </div>

      <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto overscroll-contain">
        {chaptersLoading && chapters.length === 0 ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-10 px-4 text-sm text-slate-400 text-center">
            No chapter matches “{search}”.
          </p>
        ) : (
          visible.map(({ book, chapters: list, total }) => {
            const ids = list.map((c) => c._id);
            const pickedHere = ids.filter((id) => selectedSet.has(id)).length;
            const allHere = ids.length > 0 && pickedHere === ids.length;
            const open = openBooks.includes(book._id);

            return (
              <div key={book._id} className="border-b border-slate-100 last:border-0">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-slate-50",
                    pickedHere > 0 && "bg-sky-50/60"
                  )}
                  onClick={() => toggleBookOpen(book._id)}
                >
                  <ChevronRightIcon
                    className={cn(
                      "w-4 h-4 shrink-0 text-slate-400 transition-transform",
                      open && "rotate-90"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{book.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {pickedHere > 0
                        ? `${pickedHere} of ${total} selected`
                        : `${total} chapter${total === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  {ids.length > 0 && (
                    <Button
                      variant={allHere ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-2 text-[11px] shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMany(ids, !allHere);
                      }}
                    >
                      {allHere ? "Clear" : "All"}
                    </Button>
                  )}
                </div>

                {open && (
                  <ul className="pb-1">
                    {list.map((chapter) => {
                      const count = availableByChapter?.get(chapter._id);
                      const checked = selectedSet.has(chapter._id);
                      const toggle = () => setMany([chapter._id], !checked);
                      return (
                        <li key={chapter._id}>
                          {/* A row, not a <label>: Checkbox renders a button,
                              and a label wrapping it re-sends the click to it,
                              so tapping the box itself toggled twice and did
                              nothing. The row owns the click; the box is for
                              the eye only. */}
                          <div
                            role="checkbox"
                            aria-checked={checked}
                            tabIndex={0}
                            onClick={toggle}
                            onKeyDown={(event) => {
                              if (event.key === " " || event.key === "Enter") {
                                event.preventDefault();
                                toggle();
                              }
                            }}
                            className="flex items-center gap-3 pl-9 pr-3 py-2.5 md:py-2 text-sm cursor-pointer hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus-visible:bg-slate-100"
                          >
                            <Checkbox
                              checked={checked}
                              tabIndex={-1}
                              className="pointer-events-none"
                            />
                            <span className="flex-1 leading-snug">{chapter.title}</span>
                            {count !== undefined && (
                              <span
                                className={cn(
                                  "text-[11px] tabular-nums shrink-0",
                                  count === 0 ? "text-rose-500" : "text-slate-400"
                                )}
                              >
                                {count}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChapterPicker;
