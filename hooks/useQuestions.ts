"use client";

import { toast } from "@/components/ui/use-toast";
import { ENDPOINT } from "@/lib/api";
import type { TQuestion } from "@/models/Question";
import {
  deleteQuestionsInBatch,
  fetchQuestion,
  fetchQuestions,
  postUpdateUsage,
  putUpdateQuestion,
} from "@/service/core.service";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";

const useQuestions = (
  chapter?: string,
  marks?: string,
  questionId?: string,
  tag?: string,
  timesUsed?: number
) => {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 50);
  const cache = questionId
    ? questionId
    : !chapter
    ? null
    : ENDPOINT.questions + (questionId || `${chapter + page + limit + marks + tag + timesUsed}`);
  const { data, isLoading, isValidating, error, mutate } = useSWR(
    cache,
    async () => {
      if (questionId) return await fetchQuestion(questionId);
      else if (!chapter) return null;

      return await fetchQuestions(chapter, page, limit, marks, questionId, tag, timesUsed);
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

  const updateUsage = async (questions: TQuestion[]) => {
    if (questions.length === 0) return;
    try {
      await postUpdateUsage(questions);
      refresh();
    } catch (err) {
      console.log(err);
    }
  };

  const deleteQuestions = async (
    questions: TQuestion[],
    onSuccess?: () => void
  ) => {
    if (questions.length === 0) return;
    try {
      await deleteQuestionsInBatch(questions);
      refresh();
      onSuccess?.();
      toast({
        title: "Successfully deleted questions",
        variant: "success",
      });
    } catch (err) {
      console.log(err);
      toast({
        title: (err as any).message || "something went wrong",
        variant: "destructive",
      });
    }
  };

  const updateQuestion = async (q: TQuestion) => {
    if (questions.length === 0) return;
    try {
      await putUpdateQuestion(q);
      refresh();
      toast({
        title: "Successfully updated question",
        variant: "success",
      });
    } catch (err) {
      console.log(err);
      toast({
        title: (err as any).message || "something went wrong",
        variant: "destructive",
      });
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
    deleteQuestions,
    updateQuestion,
  };
};

export default useQuestions;
