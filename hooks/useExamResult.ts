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

  const fetchExamResults = useCallback(
    async ({ batchId, subject, date }: Props = {}) => {
      setLoading(true);
      const res = await api.get(ENDPOINT.examResults, {
        params: {
          batchId,
          subject,
          date,
        },
      });
      setExamResults(res.data.data);
      setLoading(false);
    },
    []
  );

  return { examResults, loading, fetchExamResults };
};

export default useExamResults;
