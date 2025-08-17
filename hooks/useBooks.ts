"use client";

import { toast } from "@/components/ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import type { TBook } from "@/models/Book";
import { fetchBooks } from "@/service/core.service";
import useSWR from "swr";

const useBooks = (subject?: string, course?: string) => {
  const cache = !course || !subject ? null : ENDPOINT.books + subject + course;
  const { data, isLoading, isValidating, error, mutate } = useSWR(
    cache,
    async () => {
      return await fetchBooks(subject, course);
    },
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      errorRetryCount: 1,
    }
  );
  const books = (data || []) as TBook[];
  const loading = isLoading || isValidating;
  const refresh = () => mutate();

  const addBook = async (title: string) => {
    try {
      if (!course || !subject) {
        throw new Error("Please select a course and subject to add a book!");
      }
      if (!title) {
        throw new Error("Please add a book title!");
      }
      await api.post(ENDPOINT.books, {
        subject,
        course,
        title: title,
      });
      refresh();
      toast({
        title: "Successfully added a book!",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: (err as any)?.message || "Unable to add book!",
        variant: "destructive",
      });
    }
  };

  const updateBook = async (id: string, title: string) => {
    try {
      if (!title) {
        throw new Error("Please add a book title!");
      }
      await api.put(ENDPOINT.books, {
        id,
        title,
      });
      toast({
        title: "Successfully updated book title!",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: (err as any)?.message || "Unable to update book!",
        variant: "destructive",
      });
      console.log("err", err);
    } finally {
      refresh();
    }
  };

  const deleteBook = async (id: string) => {
    try {
      if (!id) {
        throw new Error("specify book id!");
      }
      await api.delete(ENDPOINT.books, {
        params: {
          id: id,
        },
      });
      refresh();
      toast({
        title: "Successfully deleted book!",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: (err as any)?.message || "Unable to add book!",
        variant: "destructive",
      });
      console.log("err", err);
    }
  };

  return {
    books,
    loading,
    error,
    refresh,
    addBook,
    deleteBook,
    updateBook,
  };
};

export default useBooks;
