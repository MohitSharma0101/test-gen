"use client";

import { ENDPOINT } from "@/lib/api";
import type { TQuestion } from "@/models/Question";
import { fetchQuestions, postUpdateUsage } from "@/service/core.service";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";

const useQuestions = (chapter?: string) => {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const marks = Number(searchParams.get("marks"));
  const cache = !chapter ? null : ENDPOINT.questions + chapter + page + limit;
  const { data, isLoading, isValidating, error, mutate } = useSWR(
    cache,
    async () => {
      if (!chapter) return;
      return await fetchQuestions(chapter, page, limit);
    },
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      errorRetryCount: 1,
      keepPreviousData: true,
    }
  );
  const questions = marks
    ? data?.questions.filter((q) => q.mark == marks) || []
    : (data?.questions as TQuestion[]);
  const loading = isLoading || isValidating;
  const refresh = () => mutate();
  const totalQuestions = data?.totalQuestions;
  const totalPages = data?.totalPages;
  const lastIndex = (page - 1) * limit;

  const updateUsage = async (questions: TQuestion[]) => {
    if (questions.length === 0) return;
    try {
      await postUpdateUsage(questions);
      refresh();
    } catch (err) {
      console.log(err);
    }
  };

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
    updateUsage,
  };
};

export default useQuestions;
