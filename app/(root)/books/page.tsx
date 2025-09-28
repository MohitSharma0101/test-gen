"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { TBook } from "@/models/Book";
import { InboxIcon } from "lucide-react";
import React, { useState } from "react";
import BookItem from "./book-item";
import useBooks from "@/hooks/useBooks";
import SelectCompact from "@/components/ui/select-compact";
import { COURSES, SUBJECT_MAP } from "@/data/const";

type Props = {};

const BooksPage = (props: Props) => {
  const [course, setCourse] = useState(COURSES[0]);
  const [subject, setSubject] = useState("");
  const { books, loading, addBook, deleteBook, updateBook } = useBooks(subject, course);
  const [chapterTitle, setBookTitle] = useState("");

  const onAddBook = async () => {
    await addBook(chapterTitle);
    setBookTitle("");
  };

  const onDeleteBook = async (id: string) => {
    await deleteBook(id);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
        <div className="flex gap-2">
            <SelectCompact
              label="Class"
              placeholder="Select a class"
              className="w-full"
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
              className="w-full"
              value={subject}
              onChange={setSubject}
              options={SUBJECT_MAP[course].map((c) => ({
                label: c,
                value: c,
              }))}
            />
          </div>
          <div className="mt-2 flex-1">
            <p className="mb-2 ml-1 text-xs">Book Title</p>
            <Input
              value={chapterTitle}
              onChange={(e) => {
                setBookTitle(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAddBook();
                }
              }}
              placeholder="Enter book title..."
            />
            <Button className="mt-4" onClick={onAddBook}>
              Add Book
            </Button>
          </div>
        </div>
        <div className="flex-1 rounded">
          <div className="rounded h-[52px] px-4 border border-slate-200 bg-slate-300 text-sm font-medium flex items-center ">
            BOOKS
          </div>
          <ol className="rounded mt-1 max-h-full flex flex-col overflow-scroll scrollbar-hide py-2  sticky top-0 bg-slate-200">
            {loading ? (
              <>
                <Skeleton className="h-[32px] mx-4 my-1 bg-slate-300 rounded-full" />
                <Skeleton className="h-[32px] mx-4 my-1 bg-slate-300 rounded-full" />
                <Skeleton className="h-[32px] mx-4 my-1 bg-slate-300 rounded-full" />
                <Skeleton className="h-[32px] mx-4 my-1 bg-slate-300 rounded-full" />
              </>
            ) : !books || books?.length === 0 ? (
              <div className="py-8 px-4 text-slate-600 flex items-center flex-col justify-center">
                <InboxIcon className="w-[62px] h-[62px]" />
                No book found!
              </div>
            ) : (
              books?.map((book: TBook, index: number) => (
                <BookItem
                  book={book}
                  key={book._id}
                  index={index}
                  onDelete={onDeleteBook}
                  onUpdate={updateBook}
                />
              ))
            )}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default BooksPage;
