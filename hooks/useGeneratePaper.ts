"use client";

import { apiErrorMsg } from "@/lib/utils";
import type { TChapter } from "@/models/Chapter";
import type { TQuestion } from "@/models/Question";
import {
  generatePaper,
  type TGeneratePaperParams,
  type TGeneratePaperResult,
  type TGenerateSection,
} from "@/service/core.service";
import { useState } from "react";
import { toast } from "sonner";

const useGeneratePaper = () => {
  const [questions, setQuestions] = useState<TQuestion[]>([]);
  const [result, setResult] = useState<TGeneratePaperResult | null>(null);
  const [loading, setLoading] = useState(false);
  // Ids of the questions being swapped out, so only that row shows a spinner
  const [swapping, setSwapping] = useState<string[]>([]);

  const generate = async (params: TGeneratePaperParams) => {
    setLoading(true);
    try {
      const res = await generatePaper(params);
      setResult(res);
      setQuestions(res.questions);
      if (res.short) {
        const thin = res.sections
          .filter((s) => s.short)
          .map((s) => `${s.subject ?? "paper"} ${s.picked}/${s.requested}`)
          .join(", ");
        toast.warning(`Not enough questions: ${thin}`);
      }
      return res;
    } catch (err) {
      toast.error(apiErrorMsg(err, "Could not generate the paper."));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // One question out, another from the same chapter in, keeping its place in
  // the paper. Every question already on the paper is excluded, so the
  // replacement is never one of them.
  const swapQuestion = async (
    question: TQuestion,
    filters: Omit<TGenerateSection, "chapterIds" | "maxQuestions" | "subject">
  ) => {
    const chapterId =
      typeof question.chapter === "string"
        ? question.chapter
        : (question.chapter as TChapter)?._id;
    if (!chapterId || !question._id) return;

    setSwapping((prev) => [...prev, question._id!]);
    try {
      const res = await generatePaper({
        sections: [{ ...filters, chapterIds: [chapterId], maxQuestions: 1 }],
        excludeQuestionIds: questions.map((q) => q._id!).filter(Boolean),
      });
      const replacement = res.questions?.[0];
      if (!replacement) {
        toast.warning("No other question left in that chapter.");
        return;
      }
      setQuestions((prev) =>
        prev.map((q) => (q._id === question._id ? replacement : q))
      );
    } catch (err) {
      toast.error(apiErrorMsg(err, "Could not swap that question."));
    } finally {
      setSwapping((prev) => prev.filter((id) => id !== question._id));
    }
  };

  const removeQuestion = (question: TQuestion) =>
    setQuestions((prev) => prev.filter((q) => q._id !== question._id));

  const reset = () => {
    setQuestions([]);
    setResult(null);
  };

  return {
    questions,
    setQuestions,
    removeQuestion,
    swapQuestion,
    swapping,
    result,
    loading,
    generate,
    reset,
  };
};

export default useGeneratePaper;
