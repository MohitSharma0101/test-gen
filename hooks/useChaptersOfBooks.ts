"use client";

import { ENDPOINT } from "@/lib/api";
import type { TChapter } from "@/models/Chapter";
import { fetchChaptersOfBooks } from "@/service/core.service";
import useSWR from "swr";

// The chapters of every selected book, for picking across books at once.
// useChapters covers the single-book case the rest of the app uses.
const useChaptersOfBooks = (bookIds: string[]) => {
  const key = [...bookIds].sort().join(",");
  const { data, isLoading, isValidating, error, mutate } = useSWR(
    key ? ENDPOINT.chapters + "books" + key : null,
    async () => fetchChaptersOfBooks(bookIds),
    {
      // Cached data shows at once and is refreshed behind it, so an edit made
      // elsewhere (see invalidateAfterWrite) is picked up when this remounts
      revalidateIfStale: true,
      revalidateOnFocus: false,
      errorRetryCount: 1,
      keepPreviousData: true,
    }
  );

  return {
    chapters: (data || []) as TChapter[],
    loading: isLoading || isValidating,
    error,
    refresh: () => mutate(),
  };
};

export default useChaptersOfBooks;
