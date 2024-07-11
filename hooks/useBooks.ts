"use client";

import { toast } from "@/components/ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import { TBook } from "@/models/Book";
import { fetchBooks } from "@/service/core.service";
import useSWR from "swr";

const useBooks = () => {
  const cache = ENDPOINT.books;
  const { data, isLoading, isValidating, error, mutate } = useSWR(
    cache,
    async () => {
      return await fetchBooks();
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
      if (!title) {
        throw new Error("Please add a chapter title!");
      }
      await api.post(ENDPOINT.books, {
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
      console.log("err", err);
    }
  };

  const updateBook = async (id: string, title: string) => {
    try {
      if (!title) {
        throw new Error("Please add a chapter title!");
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
        title: (err as any)?.message || "Unable to book chapter!",
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
        title: "Successfully deleted chapter!",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: (err as any)?.message || "Unable to add chapter!",
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
