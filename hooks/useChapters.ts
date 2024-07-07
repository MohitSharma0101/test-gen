"use client";

import { ENDPOINT } from "@/lib/api";
import { fetchChapters } from "@/service/core.service";
import useSWR from "swr";

const useChapters = (subject?: string, course?: string) => {
  const cache = ENDPOINT.chapters + subject + course;
  const { data, isLoading, isValidating, error, mutate } = useSWR(
    cache,
    async () => {
      return await fetchChapters(subject, course);
    },
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      errorRetryCount: 1,
    }
  );
  const chapters = data;
  const loading = isLoading || isValidating;
  const refresh = () => mutate();

  return {
    chapters,
    loading,
    error,
    refresh,
  };
};

export default useChapters;
