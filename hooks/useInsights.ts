"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { LIST_SWR, swrError, swrLoading } from "@/lib/swr";
import type { TQuestionStats } from "@/models/Question";

export type TAccuracyRow = { key: string; attempted: number; accuracy: number | null };
export type TChapterMastery = {
  chapterId: string;
  title: string;
  subject: string;
  course: string;
  attempted: number;
  correct: number;
  accuracy: number | null;
  recentAccuracy: number | null;
  earlierAccuracy: number | null;
  testsWrong: number;
  rated: boolean;
  adjusted: number;
};
export type TStudentInsights = {
  tests: number;
  overall: number | null;
  chapters: TChapterMastery[];
  persistentGaps: TChapterMastery[];
  byTag: TAccuracyRow[];
  byMark: TAccuracyRow[];
};

export type TInsightQuestion = {
  _id: string;
  text: string;
  ans: string;
  mark: number;
  tags: string[];
  stats: TQuestionStats | null;
  chapter: { chapterId: string; title: string; subject: string; course: string; book: string } | null;
  batchAttempts: number;
  batchCorrectRate: number | null;
  reason?: string;
};
export type TBatchInsights = {
  tests: number;
  sheets: number;
  students: number;
  reteach: { chapterId: string; title: string; subject: string; course: string; attempted: number; accuracy: number | null; studentsTested: number; studentsBelow: number }[];
  groups: {
    chapterId: string;
    title: string;
    subject: string;
    course: string;
    accuracy: number | null;
    studentsTested: number;
    studentsBelow: number;
    students: { userId: string; name: string; accuracy: number; attempted: number }[];
  }[];
  hardest: TInsightQuestion[];
  suspect: TInsightQuestion[];
};

// Keys "student-insights" / "batch-insights" are refreshed by answer-sheet
// and question-stats writes (lib/swr.ts)
export const useStudentInsights = (id?: string) => {
  const swr = useSWR(id ? ["student-insights", id] : null, async () => (await api.get(`users/${id}/insights`))?.data?.data as TStudentInsights, LIST_SWR);
  return { insights: swr.data, loading: swrLoading(swr), error: swrError(swr.error, "Couldn't load test insights"), refresh: () => swr.mutate() };
};

export const useBatchInsights = (batchId?: string) => {
  const swr = useSWR(batchId ? ["batch-insights", batchId] : null, async () => (await api.get(`batches/${batchId}/insights`))?.data?.data as TBatchInsights, LIST_SWR);
  return { insights: swr.data, loading: swrLoading(swr), error: swrError(swr.error, "Couldn't load batch insights"), refresh: () => swr.mutate() };
};
