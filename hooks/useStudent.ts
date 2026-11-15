"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { LIST_SWR, swrError, swrLoading } from "@/lib/swr";
import type { TUser } from "@/models/User";
import type { TBatch } from "@/models/Batch";

export type TStudentSummary = {
  user: Omit<TUser, "batchIds"> & { batchIds?: Pick<TBatch, "_id" | "name" | "fee" | "archived">[] };
  attendance: {
    days: { date: string; batch: string; present: boolean }[];
    byBatch: { batch: string; total: number; present: number }[];
  };
  results: {
    _id: string;
    name: string;
    subject?: string;
    date?: string;
    batch: string;
    totalMarks: number;
    marks: number | null;
    rank: number | null;
    outOf: number;
    batchAverage: number | null;
  }[];
  fees: { totalFee: number; totalPaid: number; due: number; payments: { date?: string; amount: number; mode?: string }[] };
  onlineTests: {
    _id: string;
    title: string;
    date?: string;
    obtainedMarks: number | null;
    totalMarks: number | null;
    correct: number | null;
    incorrect: number | null;
    skipped: number | null;
    submitted: boolean;
  }[];
};

// One student's whole picture (GET /api/users/:id/summary). Refreshed by any
// write to users, batches, fees, attendance, results or answer sheets
// (WRITE_EFFECTS in lib/swr.ts).
const useStudent = (id?: string) => {
  const swr = useSWR(
    id ? ["student", id] : null,
    async () => (await api.get(`users/${id}/summary`))?.data?.data as TStudentSummary,
    LIST_SWR
  );
  return {
    student: swr.data,
    loading: swrLoading(swr),
    error: swrError(swr.error, "Couldn't load this student"),
    refresh: () => swr.mutate(),
  };
};

export default useStudent;
