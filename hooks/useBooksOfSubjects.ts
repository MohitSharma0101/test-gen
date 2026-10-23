"use client";

import { ENDPOINT } from "@/lib/api";
import type { TBook } from "@/models/Book";
import { fetchBooksOfSubjects } from "@/service/core.service";
import useSWR from "swr";

// Every book of the chosen subjects in one request, so a paper spanning
// Physics, Chemistry and Biology does not need a fetch per subject.
// useBooks covers the single-subject case the rest of the app uses.
const useBooksOfSubjects = (subjects: string[], course?: string) => {
  const key = [...subjects].sort().join(",");
  const { data, isLoading, isValidating, error, mutate } = useSWR(
    key && course ? ENDPOINT.books + "subjects" + key + course : null,
    async () => fetchBooksOfSubjects(subjects, course),
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      errorRetryCount: 1,
      keepPreviousData: true,
    }
  );

  return {
    books: (data || []) as TBook[],
    loading: isLoading || isValidating,
    error,
    refresh: () => mutate(),
  };
};

export default useBooksOfSubjects;
