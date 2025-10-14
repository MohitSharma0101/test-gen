"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ENDPOINT } from "@/lib/api";
import { TAnswerSheet } from "@/models/AnswerSheet";

type Props = {
  scheduleId?: string;
};

type TAnswerSheetsRes = {
  results: TAnswerSheet[];
};

const useAnswerSheets = ({ scheduleId }: Props) => {
  const [answerSheets, setAnswerSheets] = useState<TAnswerSheetsRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnswerSheets = useCallback(async () => {
    if (!scheduleId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.get(ENDPOINT.answerSheets, {
        params: { scheduleId },
      });
      setAnswerSheets(res?.data?.data as TAnswerSheetsRes);
    } catch (err: any) {
      setError(err.message ?? "Failed to fetch answer sheets");
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    fetchAnswerSheets();
  }, [fetchAnswerSheets]);

  return {
    answerSheets,
    loading,
    error,
    refresh: fetchAnswerSheets,
  };
};

export default useAnswerSheets;
