"use client";

import { ENDPOINT } from "@/lib/api";
import { TQuestion } from "@/models/Question";
import { fetchQuestions } from "@/service/core.service";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";

const useQuestions = (chapter?: string) => {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const cache = ENDPOINT.questions + chapter + page + limit;
  const { data, isLoading, isValidating, error, mutate } = useSWR(
    cache,
    async () => {
      return await fetchQuestions(chapter, page, limit);
    },
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      errorRetryCount: 1,
      keepPreviousData: true,
    }
  );
  const questions = data?.questions as TQuestion[];
  const loading = isLoading || isValidating;
  const refresh = () => mutate();
  const totalQuestions = data?.totalQuestions;
  const totalPages = data?.totalPages;
  const lastIndex = (page - 1) * limit;

  return {
    questions,
    loading,
    error,
    page,
    limit,
    lastIndex,
    totalQuestions,
    totalPages,
    refresh,
  };
};

export default useQuestions;
