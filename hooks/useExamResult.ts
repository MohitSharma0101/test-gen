"use client";

import { api, ENDPOINT } from "@/lib/api";
import { useCallback, useState } from "react";
import { TExamResult } from "@/models/ExamResult";

type Props = {
  batchId?: string;
  subject?: string;
  date?: string;
};

const useExamResults = () => {
  const [examResults, setExamResults] = useState<TExamResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const fetchExamResults = useCallback(async ({ batchId, subject, date }: Props = {}) => {
    setLoading(true);
    setError(undefined);
    // A failed request used to leave `loading` stuck on and reject unhandled
    try {
      const res = await api.get(ENDPOINT.examResults, { params: { batchId, subject, date } });
      setExamResults(res.data?.data ?? []);
    } catch (err) {
      setError((err as Error)?.message || "Couldn't load results");
    } finally {
      setLoading(false);
    }
  }, []);

  return { examResults, loading, error, fetchExamResults };
};

export default useExamResults;
