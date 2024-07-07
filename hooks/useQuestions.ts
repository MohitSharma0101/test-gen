'use client'

import { ENDPOINT } from "@/lib/api";
import { TQuestion } from "@/models/Question";
import { fetchQuestions } from "@/service/core.service";
import useSWR from "swr";

const useQuestions = (chapter?: string) => {
  const cache = ENDPOINT.questions + chapter;
  const { data, isLoading, isValidating, error, mutate } = useSWR(
    cache,
    async () => {
      return await fetchQuestions(chapter);
    },
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      errorRetryCount: 1,
    }
  );
  const questions = data as TQuestion[];
  const loading = isLoading || isValidating;
  const refresh = () => mutate();

  return {
    questions,
    loading,
    error,
    refresh,
  };
};

export default useQuestions;
